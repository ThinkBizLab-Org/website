import { and, asc, eq, isNull, isNotNull, lt, or } from 'drizzle-orm'
import { db } from './db'
import { subscribers } from './schema'
import { sendEmail } from './email'
import { renderTrackedHtml } from './email-tracking'

// Subscriber lifecycle: a welcome email on confirmation, then a short onboarding
// drip so new subscribers get value early instead of waiting for the next digest.

function baseUrlRoot(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function unsubscribeLine(baseUrl: string, token: string | null | undefined) {
  return token ? `\n\n—\nยกเลิกการติดตาม: ${baseUrlRoot(baseUrl)}/api/subscribers/unsubscribe?token=${token}` : ''
}

// Pure: the welcome email body.
export function buildWelcomeEmail(baseUrl: string, unsubscribeToken?: string | null): { subject: string; text: string } {
  const root = baseUrlRoot(baseUrl)
  const subject = 'ยินดีต้อนรับสู่ ThinkBiz Lab 🎉'
  const text = [
    'ขอบคุณที่ยืนยันการติดตาม ThinkBiz Lab!',
    '',
    'ทุกสัปดาห์เราจะส่งบทความวิเคราะห์ธุรกิจที่นำไปใช้ได้จริงให้คุณ',
    `เริ่มอ่านบทความล่าสุดได้เลย: ${root}/articles`,
    '',
    'อยากให้เราช่วยเรื่องธุรกิจของคุณโดยตรง? ตอบกลับอีเมลนี้ได้เลย',
  ].join('\n') + unsubscribeLine(baseUrl, unsubscribeToken)
  return { subject, text }
}

export type DripStep = { afterDays: number; subject: string; body: string }

// Onboarding sequence. Each step fires once the subscriber has been confirmed
// for at least `afterDays`. Content is intentionally evergreen.
export const DRIP_STEPS: DripStep[] = [
  {
    afterDays: 2,
    subject: 'เริ่มต้นที่ไหนดี? — 3 บทความที่คนอ่านมากที่สุด',
    body: 'เราเลือกบทความยอดนิยมมาให้คุณเริ่มต้น อ่านได้ที่หน้าบทความของเรา แล้วบอกเราได้ว่าอยากอ่านเรื่องไหนเพิ่ม',
  },
  {
    afterDays: 5,
    subject: 'กรอบคิดที่เจ้าของธุรกิจที่โตเร็วใช้',
    body: 'ธุรกิจที่เติบโตอย่างมีระบบมักมีกรอบคิดร่วมกัน เราสรุปไว้ให้ในบทความหมวดกลยุทธ์ ลองนำไปปรับใช้ดู',
  },
  {
    afterDays: 9,
    subject: 'อยากได้คำแนะนำเฉพาะธุรกิจคุณไหม?',
    body: 'ถ้าคุณอยากให้เราช่วยมองภาพธุรกิจและวางแนวทางการเติบโต ทักเรามาได้เลย เรายินดีพูดคุย',
  },
]

// Pure: which drip step (index) is due now, or null. Sends at most one per run,
// in order, gated by days-since-confirmed and a minimum gap since the last send.
export function dueDripStep(
  sub: { confirmedAt: Date | string | null; dripStep: number | null; dripLastSentAt: Date | string | null },
  now: Date,
  steps: DripStep[] = DRIP_STEPS,
  minGapHours = 24,
): number | null {
  if (!sub.confirmedAt) return null
  const step = sub.dripStep ?? 0
  if (step >= steps.length) return null

  const confirmedMs = new Date(sub.confirmedAt).getTime()
  const daysSinceConfirmed = (now.getTime() - confirmedMs) / (24 * 60 * 60 * 1000)
  if (daysSinceConfirmed < steps[step].afterDays) return null

  if (sub.dripLastSentAt) {
    const gapHours = (now.getTime() - new Date(sub.dripLastSentAt).getTime()) / (60 * 60 * 1000)
    if (gapHours < minGapHours) return null
  }
  return step
}

function articlesUrl(baseUrl: string) {
  return `${baseUrlRoot(baseUrl)}/articles`
}

function unsubscribeUrl(baseUrl: string, token: string | null | undefined) {
  return token ? `${baseUrlRoot(baseUrl)}/api/subscribers/unsubscribe?token=${token}` : null
}

// Send the welcome email on confirmation (best-effort), tracked HTML + text.
export async function sendWelcomeEmail(subscriber: { id: string; email: string | null; unsubscribeToken: string | null }, baseUrl: string): Promise<boolean> {
  if (!subscriber.email) return false
  const { subject, text } = buildWelcomeEmail(baseUrl, subscriber.unsubscribeToken)
  const html = renderTrackedHtml({
    paragraphs: ['ขอบคุณที่ยืนยันการติดตาม ThinkBiz Lab!', 'ทุกสัปดาห์เราจะส่งบทความวิเคราะห์ธุรกิจที่นำไปใช้ได้จริงให้คุณ'],
    cta: { label: 'เริ่มอ่านบทความ', url: articlesUrl(baseUrl) },
    unsubscribeUrl: unsubscribeUrl(baseUrl, subscriber.unsubscribeToken),
    base: baseUrl,
    token: subscriber.unsubscribeToken,
  })
  const sent = await sendEmail({ to: subscriber.email, subject, text, html })
  if (sent) {
    await db.update(subscribers).set({ welcomeSentAt: new Date(), updatedAt: new Date() }).where(eq(subscribers.id, subscriber.id))
  }
  return sent
}

// Cron: advance each active subscriber's onboarding drip by at most one step.
export async function runNewsletterDrip(baseUrl: string, now: Date = new Date()): Promise<{ sent: number; checked: number }> {
  const candidates = await db.select().from(subscribers)
    .where(and(
      eq(subscribers.status, 'active'),
      isNull(subscribers.unsubscribedAt),
      isNotNull(subscribers.confirmedAt),
      or(isNull(subscribers.dripStep), lt(subscribers.dripStep, DRIP_STEPS.length)),
    ))
    .orderBy(asc(subscribers.confirmedAt))
    .limit(500)

  let sent = 0
  for (const sub of candidates) {
    const stepIndex = dueDripStep(sub, now)
    if (stepIndex === null || !sub.email) continue
    const step = DRIP_STEPS[stepIndex]
    const ok = await sendEmail({
      to: sub.email,
      subject: step.subject,
      text: `${step.body}\n\n${articlesUrl(baseUrl)}${unsubscribeLine(baseUrl, sub.unsubscribeToken)}`,
      html: renderTrackedHtml({
        paragraphs: [step.body],
        cta: { label: 'อ่านบทความ', url: articlesUrl(baseUrl) },
        unsubscribeUrl: unsubscribeUrl(baseUrl, sub.unsubscribeToken),
        base: baseUrl,
        token: sub.unsubscribeToken,
      }),
    })
    if (ok) {
      await db.update(subscribers).set({ dripStep: stepIndex + 1, dripLastSentAt: now, updatedAt: now }).where(eq(subscribers.id, sub.id))
      sent++
    }
  }
  return { sent, checked: candidates.length }
}

// ---- Re-engagement (win-back) --------------------------------------------

export type ReengagementOpts = { inactiveDays?: number; minAgeDays?: number; cooldownDays?: number }

// Pure: should we send a win-back email now? Targets long-confirmed subscribers
// who have shown no engagement (open/click) recently and haven't been pinged
// within the cooldown.
export function dueReengagement(
  sub: { confirmedAt: Date | string | null; lastEngagedAt: Date | string | null; reengagedAt: Date | string | null },
  now: Date,
  opts: ReengagementOpts = {},
): boolean {
  const inactiveDays = opts.inactiveDays ?? 60
  const minAgeDays = opts.minAgeDays ?? 30
  const cooldownDays = opts.cooldownDays ?? 120
  if (!sub.confirmedAt) return false

  const days = (from: Date | string) => (now.getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000)
  if (days(sub.confirmedAt) < minAgeDays) return false
  // Engaged recently → not a win-back target.
  if (sub.lastEngagedAt && days(sub.lastEngagedAt) < inactiveDays) return false
  // Respect cooldown between win-back attempts.
  if (sub.reengagedAt && days(sub.reengagedAt) < cooldownDays) return false
  return true
}

export function buildReengagementEmail(): { subject: string; paragraphs: string[] } {
  return {
    subject: 'ยังอยากได้ insight ธุรกิจจากเราอยู่ไหม?',
    paragraphs: [
      'ไม่ได้เจอกันสักพัก — เราอยากรู้ว่าคอนเทนต์ของเรายังมีประโยชน์กับคุณอยู่ไหม',
      'กดอ่านบทความล่าสุดเพื่ออยู่กับเราต่อ หรือถ้าไม่สะดวกรับอีเมลแล้ว ยกเลิกได้ทุกเมื่อด้านล่าง',
    ],
  }
}

// Cron: send a win-back email to inactive subscribers (one per cooldown window).
export async function runReengagement(baseUrl: string, now: Date = new Date(), opts: ReengagementOpts = {}): Promise<{ sent: number; checked: number }> {
  const candidates = await db.select().from(subscribers)
    .where(and(eq(subscribers.status, 'active'), isNull(subscribers.unsubscribedAt), isNotNull(subscribers.confirmedAt)))
    .orderBy(asc(subscribers.confirmedAt))
    .limit(500)

  const { subject, paragraphs } = buildReengagementEmail()
  let sent = 0
  for (const sub of candidates) {
    if (!sub.email || !dueReengagement(sub, now, opts)) continue
    const ok = await sendEmail({
      to: sub.email,
      subject,
      text: `${paragraphs.join('\n\n')}\n\n${articlesUrl(baseUrl)}${unsubscribeLine(baseUrl, sub.unsubscribeToken)}`,
      html: renderTrackedHtml({
        paragraphs,
        cta: { label: 'อ่านบทความล่าสุด', url: articlesUrl(baseUrl) },
        unsubscribeUrl: unsubscribeUrl(baseUrl, sub.unsubscribeToken),
        base: baseUrl,
        token: sub.unsubscribeToken,
      }),
    })
    if (ok) {
      await db.update(subscribers).set({ reengagedAt: now, updatedAt: now }).where(eq(subscribers.id, sub.id))
      sent++
    }
  }
  return { sent, checked: candidates.length }
}
