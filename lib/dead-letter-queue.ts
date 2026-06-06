import { and, desc, eq } from 'drizzle-orm'
import { db } from './db'
import { deadLetterQueue, mediaProductionQueue, socialPostQueue, type DeadLetterQueueItem } from './schema'

export const DEAD_LETTER_SOURCES = ['social_post_queue', 'media_production_queue'] as const
export type DeadLetterSource = (typeof DEAD_LETTER_SOURCES)[number]

export const DEAD_LETTER_STATUSES = ['pending', 'requeued', 'discarded'] as const
export type DeadLetterStatus = (typeof DEAD_LETTER_STATUSES)[number]

export const DEAD_LETTER_ACTIONS = ['requeue', 'discard'] as const
export type DeadLetterAction = (typeof DEAD_LETTER_ACTIONS)[number]

export type RecordDeadLetterInput = {
  source: DeadLetterSource
  sourceId?: string | null
  articleId?: string | null
  reference?: string | null
  payload?: unknown
  attempts?: number
  error?: string | null
}

export function normalizeDeadLetterSource(value: unknown): DeadLetterSource | null {
  return DEAD_LETTER_SOURCES.includes(value as DeadLetterSource) ? (value as DeadLetterSource) : null
}

export function normalizeDeadLetterAction(value: unknown): DeadLetterAction | null {
  return DEAD_LETTER_ACTIONS.includes(value as DeadLetterAction) ? (value as DeadLetterAction) : null
}

export function isDeadLetterPending(status: unknown): boolean {
  return status === 'pending'
}

// Records a permanently-failed queue job into the dead letter queue. A job that
// keeps failing after a requeue is folded into the same pending entry rather than
// stacking duplicates.
export async function recordDeadLetter(input: RecordDeadLetterInput) {
  const { source, sourceId = null, articleId = null, reference = null, payload = null, attempts = 0, error = null } = input
  const now = new Date()

  if (sourceId) {
    const [existing] = await db.select().from(deadLetterQueue)
      .where(and(
        eq(deadLetterQueue.source, source),
        eq(deadLetterQueue.sourceId, sourceId),
        eq(deadLetterQueue.status, 'pending'),
      ))
      .limit(1)

    if (existing) {
      const [updated] = await db.update(deadLetterQueue).set({
        articleId,
        reference,
        payload,
        attempts,
        error,
        failedAt: now,
        updatedAt: now,
      }).where(eq(deadLetterQueue.id, existing.id)).returning()
      return { item: updated, created: false }
    }
  }

  const [item] = await db.insert(deadLetterQueue).values({
    source,
    sourceId,
    articleId,
    reference,
    payload,
    attempts,
    error,
    status: 'pending',
    failedAt: now,
    updatedAt: now,
  }).returning()

  return { item, created: true }
}

export async function listDeadLetters({ status, source, limit = 200 }: { status?: DeadLetterStatus; source?: DeadLetterSource; limit?: number } = {}) {
  const filters = []
  if (status) filters.push(eq(deadLetterQueue.status, status))
  if (source) filters.push(eq(deadLetterQueue.source, source))

  const query = db.select().from(deadLetterQueue).orderBy(desc(deadLetterQueue.failedAt)).limit(Math.max(1, Math.min(limit, 500)))
  const rows = filters.length ? await query.where(and(...filters)) : await query
  return rows
}

export type ResolveDeadLetterResult =
  | { ok: true; item: DeadLetterQueueItem; requeued: boolean }
  | { ok: false; error: 'not_found' | 'already_resolved' }

// Requeues or discards a pending dead letter entry. Requeue resets the original
// source job back to `queued` so the normal cron worker picks it up again.
export async function resolveDeadLetter({ id, action, actorEmail }: { id: string; action: DeadLetterAction; actorEmail?: string | null }): Promise<ResolveDeadLetterResult> {
  const [entry] = await db.select().from(deadLetterQueue).where(eq(deadLetterQueue.id, id)).limit(1)
  if (!entry) return { ok: false, error: 'not_found' }
  if (!isDeadLetterPending(entry.status)) return { ok: false, error: 'already_resolved' }

  const now = new Date()
  let requeued = false

  if (action === 'requeue') {
    const source = normalizeDeadLetterSource(entry.source)
    if (source && entry.sourceId) requeued = await requeueSourceItem(source, entry.sourceId, now)
  }

  const [item] = await db.update(deadLetterQueue).set({
    status: action === 'requeue' ? 'requeued' : 'discarded',
    resolvedBy: actorEmail ?? null,
    resolvedAt: now,
    updatedAt: now,
  }).where(eq(deadLetterQueue.id, id)).returning()

  return { ok: true, item, requeued }
}

async function requeueSourceItem(source: DeadLetterSource, sourceId: string, now: Date): Promise<boolean> {
  if (source === 'social_post_queue') {
    const rows = await db.update(socialPostQueue).set({
      status: 'queued',
      attempts: 0,
      error: null,
      scheduledAt: now,
      processedAt: null,
      updatedAt: now,
    }).where(eq(socialPostQueue.id, sourceId)).returning({ id: socialPostQueue.id })
    return rows.length > 0
  }

  const rows = await db.update(mediaProductionQueue).set({
    status: 'queued',
    attempts: 0,
    error: null,
    providerJobId: null,
    scheduledAt: now,
    processedAt: null,
    updatedAt: now,
  }).where(eq(mediaProductionQueue.id, sourceId)).returning({ id: mediaProductionQueue.id })
  return rows.length > 0
}
