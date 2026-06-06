import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from './db'
import { articlePageViews, articles, contentFactoryTopics, type ContentFactoryTopic } from './schema'
import { generateSlug } from './markdown'
import { getSetting } from './settings-store'
import { pushLineToAdmins } from './line-admin'
import { logAudit } from './audit'
import { errorMessage, reportOperationalEvent } from './monitoring'
import { evaluateContentQuality } from './content-quality'
import { pickUniqueTopicSeed, type TopicDeduplicationCandidate } from './topic-deduplication'
import { contentSeriesToTopicSeeds } from './content-series-planner'
import { trendNewsToTopicSeeds } from './trend-news-input'

type GeneratedContent = {
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  aiSummaryQ: string
  aiSummaryA: string
  keyPoints: string[]
  faq: { q: string; a: string }[]
  readTime: number
  lineBroadcastMsg: string
  fbCaption: string
  fbHashtags: string
  ttCaption: string
  ttHashtags: string
  igCaption: string
  igHashtags: string
  coverImagePrompt?: string
  igImagePrompt?: string
  ttVdoPrompt?: string
}

export type ContentBrief = {
  targetAudience: string
  angle: string
  primaryKeywords: string[]
  outline: string[]
  cta: string
  socialObjective: string
  risks: string[]
}

const CATEGORIES = ['Strategy', 'Finance', 'Marketing', 'Startup', 'SME', 'Investment', 'AI & Tech', 'Global Case']

const SYSTEM = `You are ThinkBiz Lab's Thai business content factory.
Create one production-ready Thai business article for SME owners and entrepreneurs.
Return only valid JSON. No markdown fences.
Required JSON keys: title, excerpt, content, category, tags, aiSummaryQ, aiSummaryA, keyPoints, faq, readTime, lineBroadcastMsg, fbCaption, fbHashtags, ttCaption, ttHashtags, igCaption, igHashtags, coverImagePrompt, igImagePrompt, ttVdoPrompt.
Rules: Thai language, GEO-friendly, at least 3 question-style H2 headings in HTML content, concise mobile paragraphs, practical insights, no fabricated citations, include useful numbers only when plausible. Category must be one of: ${CATEGORIES.join(', ')}.`

const BRIEF_SYSTEM = `You are ThinkBiz Lab's Thai business content strategist.
Create a concise content brief for one Thai business article.
Return only valid JSON. No markdown fences.
Required JSON keys: targetAudience, angle, primaryKeywords, outline, cta, socialObjective, risks.
Rules: Thai language, practical for SME owners, no fabricated claims, primaryKeywords must be 4-8 items, outline must be 4-7 bullet strings, risks must list factual/legal/brand risks to watch.`

export async function runContentFactory({ limit }: { limit?: number } = {}) {
  const locked = await acquireFactoryLock()
  if (!locked) return { ok: true, skipped: true, reason: 'content factory already running' }

  try {
    return await runContentFactoryLocked({ limit })
  } finally {
    await releaseFactoryLock()
  }
}

async function runContentFactoryLocked({ limit }: { limit?: number } = {}) {
  const enabled = await getFactorySetting('content_factory_enabled', 'false')
  if (enabled !== 'true') return { ok: true, skipped: true, reason: 'content factory disabled' }

  const dailyCount = Math.max(1, Number(await getFactorySetting('content_factory_daily_count', '1')) || 1)
  const daysAhead = Math.max(1, Number(await getFactorySetting('content_factory_days_ahead', '7')) || 7)
  const publishHour = Math.max(0, Math.min(23, Number(await getFactorySetting('content_factory_publish_hour', '9')) || 9))
  const maxToGenerate = Math.max(1, (limit ?? Number(await getFactorySetting('content_factory_run_limit', '2'))) || 2)

  const planned = await ensurePlannedTopics({ dailyCount, daysAhead, publishHour })
  const due = await db.select().from(contentFactoryTopics)
    .where(eq(contentFactoryTopics.status, 'planned'))
    .orderBy(contentFactoryTopics.scheduledAt)
    .limit(maxToGenerate)

  const results = []
  for (const topic of due) {
    try {
      const brief = await ensureContentBrief(topic)
      const generated = await generateArticleFromTopic(topic.topic, topic.category, topic.tags ?? [], brief)
      const token = makeApprovalToken()
      const slug = await uniqueSlug(generated.title)
      const now = new Date()

      const articleInput = {
        title: generated.title,
        slug,
        excerpt: generated.excerpt,
        content: generated.content,
        category: generated.category || topic.category,
        tags: generated.tags,
        status: 'review',
        publishScheduledAt: topic.scheduledAt,
        aiSummaryQ: generated.aiSummaryQ,
        aiSummaryA: generated.aiSummaryA,
        keyPoints: generated.keyPoints,
        faqJson: generated.faq,
        readTime: generated.readTime || 5,
        lineBroadcastMsg: generated.lineBroadcastMsg,
        fbCaption: generated.fbCaption,
        fbHashtags: generated.fbHashtags,
        ttCaption: generated.ttCaption,
        ttHashtags: generated.ttHashtags,
        ttVdoPrompt: generated.ttVdoPrompt,
        igCaption: generated.igCaption,
        igHashtags: generated.igHashtags,
        igImagePrompt: generated.igImagePrompt,
        geoScore: 80,
        updatedAt: now,
      }
      const quality = evaluateContentQuality(articleInput)
      const [article] = await db.insert(articles).values({
        ...articleInput,
        geoScore: Math.max(articleInput.geoScore, quality.score),
      }).returning()

      const qualityGateEnabled = await getFactorySetting('content_factory_quality_gate_enabled', 'true')
      if (qualityGateEnabled === 'true' && !quality.passed) {
        await reportOperationalEvent({
          name: 'content_factory.quality.warning',
          severity: 'warning',
          message: `Quality gate warning for ${article.title}`,
          context: {
            topicId: topic.id,
            articleId: article.id,
            score: quality.score,
            failedChecks: quality.checks.filter(check => !check.ok).map(check => check.key),
          },
        })
      }

      const tokenExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const line = await pushLineToAdmins(formatApprovalMessage({ token, articleId: article.id, title: article.title, scheduledAt: topic.scheduledAt }))

      await db.update(contentFactoryTopics).set({
        status: line.ok ? 'notified' : 'generated',
        articleId: article.id,
        approvalToken: token,
        approvalTokenExpiresAt: tokenExpires,
        lineNotifiedAt: line.ok ? now : null,
        error: line.ok ? null : line.error ?? null,
        updatedAt: now,
      }).where(eq(contentFactoryTopics.id, topic.id))

      await logAudit({ actorEmail: 'content-factory', action: 'content_factory.generate', entityType: 'article', entityId: article.id, metadata: { topicId: topic.id, scheduledAt: topic.scheduledAt, lineSent: line.sent } })
      results.push({ topicId: topic.id, articleId: article.id, title: article.title, notified: line.ok, qualityScore: quality.score, qualityPassed: quality.passed })
    } catch (error) {
      const message = errorMessage(error)
      await db.update(contentFactoryTopics).set({ status: 'failed', error: message, updatedAt: new Date() }).where(eq(contentFactoryTopics.id, topic.id))
      await reportOperationalEvent({ name: 'content_factory.generate.failed', severity: 'error', message, context: { topicId: topic.id, topic: topic.topic } })
      results.push({ topicId: topic.id, error: message })
    }
  }

  return { ok: true, planned: planned.length, generated: results.length, results }
}

export async function generateContentBriefForTopic(topicId: string, actor = 'admin') {
  const [topic] = await db.select().from(contentFactoryTopics).where(eq(contentFactoryTopics.id, topicId)).limit(1)
  if (!topic) return { ok: false, message: 'ไม่พบ topic สำหรับ generate brief' }
  if (!['planned', 'failed', 'rejected'].includes(topic.status)) {
    return { ok: false, message: 'generate brief ได้เฉพาะ topic ที่ยังไม่ generate article' }
  }

  const brief = await generateBriefFromTopic(topic.topic, topic.category, topic.tags ?? [])
  await db.update(contentFactoryTopics).set({
    contentBrief: brief,
    error: null,
    updatedAt: new Date(),
  }).where(eq(contentFactoryTopics.id, topic.id))
  await logAudit({
    actorEmail: actor,
    action: 'content_factory.brief.generate',
    entityType: 'content_factory_topic',
    entityId: topic.id,
    metadata: { topic: topic.topic, category: topic.category },
  })

  return { ok: true, message: `Brief generated: ${topic.topic}`, brief }
}

async function acquireFactoryLock() {
  const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const rows = await db.execute(sql`
    insert into settings (key, value, updated_at)
    values ('content_factory_lock_until', ${lockUntil}, now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = now()
      where settings.value::timestamptz < now()
    returning key
  `) as unknown as { key: string }[]
  return rows.length > 0
}

async function releaseFactoryLock() {
  await db.execute(sql`
    update settings
    set value = ${new Date(0).toISOString()},
        updated_at = now()
    where key = 'content_factory_lock_until'
  `)
}

export async function approveContentFactoryArticle(token: string, actor = 'line') {
  const normalized = token.trim().toUpperCase()
  const [topic] = await db.select().from(contentFactoryTopics).where(eq(contentFactoryTopics.approvalToken, normalized)).limit(1)
  if (!topic || !topic.articleId) return { ok: false, message: 'ไม่พบรหัส approve นี้' }
  if (topic.approvalTokenExpiresAt && topic.approvalTokenExpiresAt < new Date()) return { ok: false, message: 'รหัส approve หมดอายุแล้ว' }

  await approveTopic(topic.id, topic.articleId, actor)

  return { ok: true, message: `✅ Approved แล้ว\nบทความจะเผยแพร่ตามเวลาใน Content Calendar\n\nTopic: ${topic.topic}` }
}

export async function approveContentFactoryTopic(topicId: string, actor = 'admin') {
  const [topic] = await db.select().from(contentFactoryTopics).where(eq(contentFactoryTopics.id, topicId)).limit(1)
  if (!topic || !topic.articleId) return { ok: false, message: 'ไม่พบ topic หรือ article สำหรับ approve' }
  if (topic.status === 'published') return { ok: false, message: 'บทความ publish ไปแล้ว' }

  await approveTopic(topic.id, topic.articleId, actor)

  return { ok: true, message: `Approved: ${topic.topic}` }
}

export async function rejectContentFactoryArticle(token: string, reason: string, actor = 'line') {
  const normalized = token.trim().toUpperCase()
  const [topic] = await db.select().from(contentFactoryTopics).where(eq(contentFactoryTopics.approvalToken, normalized)).limit(1)
  if (!topic || !topic.articleId) return { ok: false, message: 'ไม่พบรหัส reject นี้' }
  if (topic.status === 'approved' || topic.status === 'published') return { ok: false, message: 'บทความนี้ approve หรือ publish ไปแล้ว ไม่สามารถ reject ด้วย LINE ได้' }

  const rejectionReason = reason.trim() || 'Rejected by LINE admin'
  await rejectTopic(topic.id, topic.articleId, rejectionReason, actor)

  return { ok: true, message: `↩️ Rejected แล้ว\nบทความถูกย้ายกลับเป็น draft\n\nTopic: ${topic.topic}\nReason: ${rejectionReason}` }
}

export async function rejectContentFactoryTopic(topicId: string, reason: string, actor = 'admin') {
  const [topic] = await db.select().from(contentFactoryTopics).where(eq(contentFactoryTopics.id, topicId)).limit(1)
  if (!topic || !topic.articleId) return { ok: false, message: 'ไม่พบ topic หรือ article สำหรับ reject' }
  if (topic.status === 'approved' || topic.status === 'published') return { ok: false, message: 'บทความ approve หรือ publish ไปแล้ว' }

  await rejectTopic(topic.id, topic.articleId, reason, actor)

  return { ok: true, message: `Rejected: ${topic.topic}` }
}

export async function requeueContentFactoryTopic(topicId: string, actor = 'admin') {
  const [topic] = await db.select().from(contentFactoryTopics).where(eq(contentFactoryTopics.id, topicId)).limit(1)
  if (!topic) return { ok: false, message: 'ไม่พบ topic สำหรับ requeue' }
  if (!['rejected', 'failed'].includes(topic.status)) return { ok: false, message: 'requeue ได้เฉพาะ rejected หรือ failed topic' }

  const now = new Date()
  await db.update(contentFactoryTopics).set({
    status: 'planned',
    articleId: null,
    approvalToken: null,
    approvalTokenExpiresAt: null,
    approvedAt: null,
    lineNotifiedAt: null,
    error: null,
    updatedAt: now,
  }).where(eq(contentFactoryTopics.id, topic.id))
  await logAudit({
    actorEmail: actor,
    action: 'content_factory.requeue',
    entityType: 'content_factory_topic',
    entityId: topic.id,
    metadata: { previousArticleId: topic.articleId, previousStatus: topic.status },
  })

  return { ok: true, message: `Requeued: ${topic.topic}` }
}

async function approveTopic(topicId: string, articleId: string, actor: string) {
  const now = new Date()
  await db.update(articles).set({ status: 'approved', updatedAt: now }).where(eq(articles.id, articleId))
  await db.update(contentFactoryTopics).set({ status: 'approved', approvedAt: now, updatedAt: now }).where(eq(contentFactoryTopics.id, topicId))
  await logAudit({ actorEmail: actor, action: 'content_factory.approve', entityType: 'article', entityId: articleId, metadata: { topicId } })
}

async function rejectTopic(topicId: string, articleId: string, reason: string, actor: string) {
  const now = new Date()
  const rejectionReason = reason.trim() || 'Rejected by admin'
  await db.update(articles).set({ status: 'draft', updatedAt: now }).where(eq(articles.id, articleId))
  await db.update(contentFactoryTopics).set({
    status: 'rejected',
    error: rejectionReason,
    updatedAt: now,
  }).where(eq(contentFactoryTopics.id, topicId))
  await logAudit({
    actorEmail: actor,
    action: 'content_factory.reject',
    entityType: 'article',
    entityId: articleId,
    metadata: { topicId, reason: rejectionReason },
  })
}

async function ensurePlannedTopics({ dailyCount, daysAhead, publishHour }: { dailyCount: number; daysAhead: number; publishHour: number }) {
  const created: ContentFactoryTopic[] = []
  const seeds = await topicSeeds()
  const existingTopics = await topicDeduplicationCandidates()

  for (let offset = 1; offset <= daysAhead; offset++) {
    const start = startOfDay(addDays(new Date(), offset))
    const end = addDays(start, 1)
    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(contentFactoryTopics)
      .where(and(gte(contentFactoryTopics.scheduledAt, start), lt(contentFactoryTopics.scheduledAt, end)))

    const needed = Math.max(0, dailyCount - Number(existing[0]?.count ?? 0))
    for (let i = 0; i < needed; i++) {
      const seed = pickUniqueTopicSeed(
        seeds,
        offset + i + created.length,
        existingTopics,
        created.map(item => ({ title: item.topic, category: item.category })),
      )
      if (!seed) {
        await reportOperationalEvent({
          name: 'content_factory.topic_deduplication.exhausted',
          severity: 'warning',
          message: 'No unique content factory topic seed available',
          context: { offset, dailyCount, daysAhead, seedCount: seeds.length },
        })
        break
      }
      const scheduledAt = new Date(start)
      scheduledAt.setHours(publishHour + i, 0, 0, 0)
      const [topic] = await db.insert(contentFactoryTopics).values({
        topic: seed.topic,
        category: seed.category,
        tags: seed.tags,
        scheduledAt,
        updatedAt: new Date(),
      }).returning()
      created.push(topic)
      existingTopics.push({ title: topic.topic, category: topic.category })
    }
  }
  return created
}

async function topicDeduplicationCandidates(): Promise<TopicDeduplicationCandidate[]> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const [topicRows, articleRows] = await Promise.all([
    db.select({
      title: contentFactoryTopics.topic,
      category: contentFactoryTopics.category,
    }).from(contentFactoryTopics)
      .where(gte(contentFactoryTopics.scheduledAt, ninetyDaysAgo))
      .limit(500),
    db.select({
      title: articles.title,
      category: articles.category,
    }).from(articles)
      .where(gte(articles.createdAt, ninetyDaysAgo))
      .limit(500),
  ])

  return [...topicRows, ...articleRows]
    .map(row => ({ title: row.title, category: row.category }))
    .filter(row => Boolean(row.title))
}

async function ensureContentBrief(topic: ContentFactoryTopic) {
  const existing = parseContentBrief(topic.contentBrief)
  if (existing) return existing

  const brief = await generateBriefFromTopic(topic.topic, topic.category, topic.tags ?? [])
  await db.update(contentFactoryTopics).set({
    contentBrief: brief,
    updatedAt: new Date(),
  }).where(eq(contentFactoryTopics.id, topic.id))
  return brief
}

async function generateBriefFromTopic(topic: string, category: string | null, tags: string[]): Promise<ContentBrief> {
  const apiKey = await getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: BRIEF_SYSTEM,
    messages: [{
      role: 'user',
      content: `Topic: ${topic}\nPreferred category: ${category ?? 'auto'}\nSuggested tags: ${tags.join(', ') || 'auto'}\nCreate the content brief.`,
    }],
  })
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return normalizeContentBrief(JSON.parse(jsonrepair(cleaned)))
}

function parseContentBrief(value: unknown): ContentBrief | null {
  if (!value || typeof value !== 'object') return null
  return normalizeContentBrief(value)
}

function normalizeContentBrief(value: unknown): ContentBrief {
  const raw = value as Partial<ContentBrief>
  return {
    targetAudience: String(raw.targetAudience ?? '').trim(),
    angle: String(raw.angle ?? '').trim(),
    primaryKeywords: Array.isArray(raw.primaryKeywords) ? raw.primaryKeywords.map(String).filter(Boolean).slice(0, 12) : [],
    outline: Array.isArray(raw.outline) ? raw.outline.map(String).filter(Boolean).slice(0, 10) : [],
    cta: String(raw.cta ?? '').trim(),
    socialObjective: String(raw.socialObjective ?? '').trim(),
    risks: Array.isArray(raw.risks) ? raw.risks.map(String).filter(Boolean).slice(0, 10) : [],
  }
}

async function generateArticleFromTopic(topic: string, category: string | null, tags: string[], brief: ContentBrief): Promise<GeneratedContent> {
  const apiKey = await getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: [
        `Topic: ${topic}`,
        `Preferred category: ${category ?? 'auto'}`,
        `Suggested tags: ${tags.join(', ') || 'auto'}`,
        '',
        'Content brief:',
        JSON.stringify(brief),
        '',
        'Create one complete article and social captions that follow this brief.',
      ].join('\n'),
    }],
  })
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(jsonrepair(cleaned)) as GeneratedContent
}

async function topicSeeds() {
  const raw = await getFactorySetting('content_factory_topic_bank', '')
  const seriesRaw = await getFactorySetting('content_factory_series_plans', '')
  const trendRaw = await getFactorySetting('content_factory_trend_news_inputs', '')
  const seriesSeeds = contentSeriesToTopicSeeds(seriesRaw)
  const trendSeeds = trendNewsToTopicSeeds(trendRaw)
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length > 0) {
    const manualSeeds = lines.map(line => {
      const [topic, category = 'Strategy', tagText = ''] = line.split('|').map(v => v.trim())
      return { topic, category, tags: tagText.split(',').map(t => t.trim()).filter(Boolean) }
    })
    return [...seriesSeeds, ...trendSeeds, ...(await blendWithPerformanceSeeds(manualSeeds))]
  }

  const defaultSeeds = [
    { topic: 'ทำไม SME ต้องมี cash conversion cycle ที่สั้นลง?', category: 'Finance', tags: ['SME', 'Cashflow', 'Finance'] },
    { topic: 'กลยุทธ์ตั้งราคาที่ทำให้กำไรเพิ่มโดยไม่ต้องขายมากขึ้น?', category: 'Strategy', tags: ['Pricing', 'Strategy', 'SME'] },
    { topic: 'AI ช่วยลดงานซ้ำในธุรกิจขนาดเล็กได้อย่างไร?', category: 'AI & Tech', tags: ['AI', 'Automation', 'SME'] },
    { topic: 'ทำไมลูกค้าซื้อซ้ำสำคัญกว่าการหาลูกค้าใหม่?', category: 'Marketing', tags: ['Retention', 'Marketing', 'Customer'] },
    { topic: 'Founder ควรวัดตัวเลขอะไรทุกสัปดาห์?', category: 'Startup', tags: ['Startup', 'Metrics', 'Founder'] },
  ]
  return [...seriesSeeds, ...trendSeeds, ...(await blendWithPerformanceSeeds(defaultSeeds))]
}

async function blendWithPerformanceSeeds(seeds: { topic: string; category: string; tags: string[] }[]) {
  const enabled = await getFactorySetting('content_factory_analytics_feedback_enabled', 'true')
  if (enabled !== 'true') return seeds

  const rows = await db.select({
    category: articles.category,
    views: sql<number>`count(${articlePageViews.id})::int`,
  }).from(articlePageViews)
    .leftJoin(articles, eq(articlePageViews.articleId, articles.id))
    .where(gte(articlePageViews.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .groupBy(articles.category)
    .orderBy(desc(sql`count(${articlePageViews.id})`))
    .limit(3)

  const performanceSeeds = rows
    .map(row => row.category)
    .filter((category): category is string => Boolean(category))
    .flatMap(category => [
      { topic: `บทเรียนล่าสุดจากหมวด ${category}: SME ควรเอาไปใช้ตรงไหนก่อน?`, category, tags: [category, 'SME', 'Strategy'] },
      { topic: `คำถามที่เจ้าของธุรกิจควรถามก่อนลงทุนเรื่อง ${category}?`, category, tags: [category, 'Decision', 'Business'] },
    ])

  return [...performanceSeeds, ...seeds]
}

async function getFactorySetting(key: string, fallback: string) {
  const value = await getSetting(key)
  return value || process.env[key.toUpperCase()] || fallback
}

async function uniqueSlug(title: string) {
  const base = generateSlug(title)
  let slug = base
  for (let i = 2; i < 20; i++) {
    const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1)
    if (existing.length === 0) return slug
    slug = `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

function makeApprovalToken() {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

function formatApprovalMessage({ token, articleId, title, scheduledAt }: { token: string; articleId: string; title: string; scheduledAt: Date }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thinkbizlab.com'
  return [
    '🧠 Content Factory สร้างบทความเสร็จแล้ว',
    '',
    title,
    `Publish: ${scheduledAt.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
    '',
    `ตรวจ: ${base}/admin/articles/${articleId}`,
    '',
    `ถ้าผ่าน ให้ตอบ: approve ${token}`,
    'ถ้ายังไม่ผ่าน ให้แก้ใน CMS แล้วค่อย approve',
  ].join('\n')
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}
