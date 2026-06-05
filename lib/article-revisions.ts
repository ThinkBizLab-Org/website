import { desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { articleRevisions, type Article } from './schema'

export type ArticleRevisionAction = 'create' | 'update' | 'patch' | 'restore' | 'delete'

const RESTORABLE_FIELDS = [
  'title',
  'slug',
  'excerpt',
  'content',
  'coverImage',
  'category',
  'tags',
  'status',
  'aiSummaryQ',
  'aiSummaryA',
  'keyPoints',
  'faqJson',
  'schemaJson',
  'geoScore',
  'readTime',
  'featured',
  'publishScheduledAt',
  'lineBroadcastMsg',
  'fbCaption',
  'fbHashtags',
  'ttCaption',
  'ttHashtags',
  'ttVideoUrl',
  'ttVdoPrompt',
  'igCaption',
  'igHashtags',
  'igVideoUrl',
  'igImagePrompt',
  'igImage',
  'publishedAt',
] as const

export async function createArticleRevision({
  article,
  action,
  actorEmail,
}: {
  article: Article
  action: ArticleRevisionAction
  actorEmail?: string | null
}) {
  try {
    const [row] = await db
      .select({ value: sql<number>`coalesce(max(${articleRevisions.version}), 0)` })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, article.id))

    const version = Number(row?.value ?? 0) + 1
    await db.insert(articleRevisions).values({
      articleId: article.id,
      version,
      action,
      actorEmail: actorEmail ?? null,
      snapshot: serializeArticle(article),
    })
    return version
  } catch (error) {
    console.error('[article-revision] failed:', error)
    return null
  }
}

export async function listArticleRevisions(articleId: string) {
  return db
    .select({
      id: articleRevisions.id,
      articleId: articleRevisions.articleId,
      version: articleRevisions.version,
      action: articleRevisions.action,
      actorEmail: articleRevisions.actorEmail,
      createdAt: articleRevisions.createdAt,
    })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, articleId))
    .orderBy(desc(articleRevisions.version))
    .limit(80)
}

export async function getArticleRevision(revisionId: string) {
  const [revision] = await db.select().from(articleRevisions).where(eq(articleRevisions.id, revisionId)).limit(1)
  return revision
}

export function articleSnapshotToUpdate(snapshot: unknown) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot as Record<string, unknown> : {}
  const update: Record<string, unknown> = {}

  for (const field of RESTORABLE_FIELDS) {
    if (field in source) update[field] = normalizeSnapshotValue(source[field])
  }

  update.updatedAt = new Date()
  return update
}

function serializeArticle(article: Article) {
  return {
    ...article,
    createdAt: article.createdAt?.toISOString?.() ?? article.createdAt,
    updatedAt: article.updatedAt?.toISOString?.() ?? article.updatedAt,
    publishedAt: article.publishedAt?.toISOString?.() ?? article.publishedAt,
    publishScheduledAt: article.publishScheduledAt?.toISOString?.() ?? article.publishScheduledAt,
    lineBroadcastAt: article.lineBroadcastAt?.toISOString?.() ?? article.lineBroadcastAt,
    fbSentAt: article.fbSentAt?.toISOString?.() ?? article.fbSentAt,
    ttSentAt: article.ttSentAt?.toISOString?.() ?? article.ttSentAt,
    igSentAt: article.igSentAt?.toISOString?.() ?? article.igSentAt,
  }
}

function normalizeSnapshotValue(value: unknown) {
  if (typeof value !== 'string') return value
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value)
  return value
}
