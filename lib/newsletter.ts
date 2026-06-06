import { and, desc, eq, gte, isNull, isNotNull } from 'drizzle-orm'
import { db } from './db'
import { articles, subscribers } from './schema'
import { getSetting, getSettings, setSetting } from './settings-store'
import { logAudit } from './audit'

// Sends a periodic newsletter of recently published articles to confirmed
// subscribers via Resend, with a per-recipient unsubscribe link. Opt-in.

export const NEWSLETTER_SETTING = 'newsletter'
const NEWSLETTER_LAST_SENT = 'newsletter_last_sent_at'

export type NewsletterConfig = {
  enabled: boolean
  lookbackDays: number
  maxArticles: number
}

export const DEFAULT_NEWSLETTER: NewsletterConfig = {
  enabled: false,
  lookbackDays: 7,
  maxArticles: 10,
}

export function parseNewsletterConfig(raw: unknown): NewsletterConfig {
  let source: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw) as Record<string, unknown>
    } catch {
      source = {}
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>
  }
  const num = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback
  }
  return {
    enabled: source.enabled === true || source.enabled === 'true',
    lookbackDays: num(source.lookbackDays, DEFAULT_NEWSLETTER.lookbackDays, 1, 90),
    maxArticles: num(source.maxArticles, DEFAULT_NEWSLETTER.maxArticles, 1, 50),
  }
}

export type NewsletterArticle = { title: string; slug: string; excerpt: string | null }

// Pure: renders the newsletter subject + plain-text body for a set of articles.
export function buildNewsletterContent(items: NewsletterArticle[], baseUrl: string): { subject: string; text: string } {
  const root = baseUrl.replace(/\/+$/, '')
  const subject = items.length === 1
    ? `ThinkBiz Lab: ${items[0].title}`
    : `ThinkBiz Lab: บทความใหม่ ${items.length} เรื่อง`
  const body = items.map(item => {
    const url = `${root}/articles/${item.slug}`
    return `• ${item.title}\n  ${item.excerpt ? `${item.excerpt}\n  ` : ''}${url}`
  }).join('\n\n')
  const text = `อ่านบทความใหม่จาก ThinkBiz Lab\n\n${body}`
  return { subject, text }
}

export async function getNewsletterArticles(config: NewsletterConfig, now: Date = new Date()): Promise<NewsletterArticle[]> {
  const since = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000)
  const rows = await db.select({ title: articles.title, slug: articles.slug, excerpt: articles.excerpt })
    .from(articles)
    .where(and(eq(articles.status, 'published'), gte(articles.publishedAt, since)))
    .orderBy(desc(articles.publishedAt))
    .limit(config.maxArticles)
  return rows
}

export async function loadNewsletterConfig(): Promise<NewsletterConfig> {
  try {
    return parseNewsletterConfig(await getSetting(NEWSLETTER_SETTING))
  } catch {
    return { ...DEFAULT_NEWSLETTER }
  }
}

export async function saveNewsletterConfig(config: NewsletterConfig): Promise<NewsletterConfig> {
  const normalized = parseNewsletterConfig(config)
  await setSetting(NEWSLETTER_SETTING, JSON.stringify(normalized))
  return normalized
}

async function resendCreds() {
  const map = await getSettings(['resend_api_key', 'notify_email_from'])
  return {
    apiKey: map.resend_api_key || process.env.RESEND_API_KEY || '',
    from: map.notify_email_from || process.env.NOTIFY_EMAIL_FROM || '',
  }
}

export type NewsletterResult = { ok: true; skipped?: boolean; reason?: string; sent: number; failed: number; recipients: number; articles: number }

export async function sendNewsletter({ now = new Date(), manual = false }: { now?: Date; manual?: boolean } = {}): Promise<NewsletterResult> {
  const config = await loadNewsletterConfig()
  if (!config.enabled && !manual) return { ok: true, skipped: true, reason: 'disabled', sent: 0, failed: 0, recipients: 0, articles: 0 }

  // De-dupe: skip if a newsletter already went out within the lookback window.
  if (!manual) {
    const last = await getSetting(NEWSLETTER_LAST_SENT).catch(() => null)
    if (last) {
      const elapsedDays = (now.getTime() - new Date(last).getTime()) / (24 * 60 * 60 * 1000)
      if (elapsedDays < config.lookbackDays - 1) return { ok: true, skipped: true, reason: 'already sent recently', sent: 0, failed: 0, recipients: 0, articles: 0 }
    }
  }

  const items = await getNewsletterArticles(config, now)
  if (items.length === 0) return { ok: true, skipped: true, reason: 'no new articles', sent: 0, failed: 0, recipients: 0, articles: 0 }

  const { apiKey, from } = await resendCreds()
  if (!apiKey || !from) return { ok: true, skipped: true, reason: 'resend not configured', sent: 0, failed: 0, recipients: 0, articles: items.length }

  const recipients = await db.select({ email: subscribers.email, unsubscribeToken: subscribers.unsubscribeToken })
    .from(subscribers)
    .where(and(eq(subscribers.status, 'active'), isNull(subscribers.unsubscribedAt), isNotNull(subscribers.email)))
    .limit(5000)

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thinkbizlab.com').replace(/\/+$/, '')
  const { subject, text } = buildNewsletterContent(items, base)

  let sent = 0
  let failed = 0
  for (const recipient of recipients) {
    if (!recipient.email) continue
    const unsubscribe = recipient.unsubscribeToken ? `\n\n—\nยกเลิกการรับข่าวสาร: ${base}/api/subscribers/unsubscribe?token=${recipient.unsubscribeToken}` : ''
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: [recipient.email], subject, text: text + unsubscribe }),
      })
      if (res.ok) sent++
      else failed++
    } catch {
      failed++
    }
  }

  await setSetting(NEWSLETTER_LAST_SENT, now.toISOString())
  await logAudit({ actorEmail: 'newsletter', action: 'newsletter.send', entityType: 'newsletter', metadata: { sent, failed, recipients: recipients.length, articles: items.length, manual } })

  return { ok: true, sent, failed, recipients: recipients.length, articles: items.length }
}
