import type { Session } from 'next-auth'
import { db } from './db'
import { auditLogs, publishAttempts } from './schema'

export async function logAudit({
  session,
  actorEmail,
  action,
  entityType,
  entityId,
  metadata,
}: {
  session?: Session | null
  actorEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: unknown
}) {
  try {
    await db.insert(auditLogs).values({
      actorEmail: actorEmail ?? session?.user?.email ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata,
    })
  } catch (error) {
    console.error('[audit] failed:', error)
  }
}

export async function logPublishAttempt({
  articleId,
  platform,
  status,
  mode = 'manual',
  error,
  metadata,
}: {
  articleId?: string | null
  platform: string
  status: 'success' | 'failed' | 'skipped'
  mode?: 'manual' | 'cron' | 'test' | 'reset'
  error?: string | null
  metadata?: unknown
}) {
  try {
    await db.insert(publishAttempts).values({
      articleId: articleId || null,
      platform,
      status,
      mode,
      error: error ?? null,
      metadata,
    })
  } catch (err) {
    console.error('[publish-attempt] failed:', err)
  }
}
