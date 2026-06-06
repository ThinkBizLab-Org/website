import { and, desc, eq } from 'drizzle-orm'
import { db } from './db'
import { deadLetterQueue, mediaProductionQueue, socialPostQueue, type DeadLetterQueueItem } from './schema'
import { dispatchNotification } from './notifications'
import { getSetting, setSetting } from './settings-store'

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

  // Carry forward the auto-retry count from the most recent prior entry for this
  // job, so the auto-retry cap holds across requeue → fail-again cycles (each
  // re-failure creates a fresh pending entry).
  let inheritedAutoRetries = 0
  if (sourceId) {
    const [prior] = await db.select({ autoRetries: deadLetterQueue.autoRetries }).from(deadLetterQueue)
      .where(and(eq(deadLetterQueue.source, source), eq(deadLetterQueue.sourceId, sourceId)))
      .orderBy(desc(deadLetterQueue.failedAt))
      .limit(1)
    inheritedAutoRetries = prior?.autoRetries ?? 0
  }

  const [item] = await db.insert(deadLetterQueue).values({
    source,
    sourceId,
    articleId,
    reference,
    payload,
    attempts,
    autoRetries: inheritedAutoRetries,
    error,
    status: 'pending',
    failedAt: now,
    updatedAt: now,
  }).returning()

  await dispatchNotification({
    event: 'dead_letter',
    message: `${source}${reference ? ` (${reference})` : ''} failed after ${attempts} attempts: ${error ?? 'unknown error'}`,
    context: { deadLetterId: item.id, source, sourceId, articleId, reference, attempts },
  })

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

// ---- Auto-retry -----------------------------------------------------------

export const DLQ_AUTO_RETRY_SETTING = 'dlq_auto_retry'

export type DlqAutoRetryConfig = {
  enabled: boolean
  maxAutoRetries: number
  backoffMinutes: number
}

export const DEFAULT_DLQ_AUTO_RETRY: DlqAutoRetryConfig = {
  enabled: true,
  maxAutoRetries: 3,
  backoffMinutes: 30,
}

export function parseDlqAutoRetry(raw: unknown): DlqAutoRetryConfig {
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
  const max = Number(source.maxAutoRetries)
  const backoff = Number(source.backoffMinutes)
  return {
    enabled: source.enabled === undefined ? DEFAULT_DLQ_AUTO_RETRY.enabled : source.enabled === true || source.enabled === 'true',
    maxAutoRetries: Number.isFinite(max) ? Math.max(0, Math.min(10, Math.trunc(max))) : DEFAULT_DLQ_AUTO_RETRY.maxAutoRetries,
    backoffMinutes: Number.isFinite(backoff) ? Math.max(0, Math.min(1440, Math.trunc(backoff))) : DEFAULT_DLQ_AUTO_RETRY.backoffMinutes,
  }
}

// Pure: decide whether a pending entry is eligible for an automatic retry now.
export function shouldAutoRetry(
  entry: Pick<DeadLetterQueueItem, 'status' | 'sourceId' | 'autoRetries' | 'failedAt'>,
  config: DlqAutoRetryConfig,
  now: Date = new Date(),
): boolean {
  if (!config.enabled) return false
  if (entry.status !== 'pending') return false
  if (!entry.sourceId) return false
  if ((entry.autoRetries ?? 0) >= config.maxAutoRetries) return false
  const failedAt = entry.failedAt ? new Date(entry.failedAt).getTime() : 0
  return now.getTime() - failedAt >= config.backoffMinutes * 60 * 1000
}

export async function loadDlqAutoRetry(): Promise<DlqAutoRetryConfig> {
  try {
    return parseDlqAutoRetry(await getSetting(DLQ_AUTO_RETRY_SETTING))
  } catch {
    return { ...DEFAULT_DLQ_AUTO_RETRY }
  }
}

export async function saveDlqAutoRetry(config: DlqAutoRetryConfig): Promise<DlqAutoRetryConfig> {
  const normalized = parseDlqAutoRetry(config)
  await setSetting(DLQ_AUTO_RETRY_SETTING, JSON.stringify(normalized))
  return normalized
}

// Re-drains eligible pending dead letters: requeues the source job (resetting it
// to `queued`) and marks the entry `requeued` with an incremented auto-retry
// count. Entries that hit the cap are left pending for a human. Best-effort and
// safe to call at the top of each queue cron.
export async function autoRetryDeadLetters(now: Date = new Date()): Promise<{ retried: number; skipped: number }> {
  const config = await loadDlqAutoRetry()
  if (!config.enabled) return { retried: 0, skipped: 0 }

  const pending = await listDeadLetters({ status: 'pending', limit: 200 })
  let retried = 0
  let skipped = 0

  for (const entry of pending) {
    if (!shouldAutoRetry(entry, config, now)) {
      skipped++
      continue
    }
    const source = normalizeDeadLetterSource(entry.source)
    const ok = source && entry.sourceId ? await requeueSourceItem(source, entry.sourceId, now) : false
    if (!ok) {
      skipped++
      continue
    }
    await db.update(deadLetterQueue).set({
      status: 'requeued',
      autoRetries: (entry.autoRetries ?? 0) + 1,
      resolvedBy: 'auto-retry',
      resolvedAt: now,
      updatedAt: now,
    }).where(eq(deadLetterQueue.id, entry.id))
    retried++
  }

  return { retried, skipped }
}
