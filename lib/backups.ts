import { eq } from 'drizzle-orm'
import { db } from './db'
import { articles, backupJobs, categories, subscribers, settings } from './schema'
import { uploadPrivateBackupToR2 } from './r2'
import { reportOperationalEvent } from './monitoring'

function maskSetting(key: string, value: string) {
  const sensitive = /(secret|token|key|password|client_secret)/i.test(key)
  if (!sensitive) return value
  return value ? `${value.slice(0, 4)}...${value.slice(-4)}` : ''
}

export async function runBackup(trigger: 'manual' | 'cron' = 'manual') {
  const [job] = await db.insert(backupJobs).values({ trigger, status: 'processing', startedAt: new Date() }).returning()

  try {
    const [articleRows, categoryRows, subscriberRows, settingRows] = await Promise.all([
      db.select().from(articles),
      db.select().from(categories),
      db.select().from(subscribers),
      db.select().from(settings),
    ])

    const snapshot = {
      service: 'thinkbiz-app',
      version: 1,
      createdAt: new Date().toISOString(),
      counts: {
        articles: articleRows.length,
        categories: categoryRows.length,
        subscribers: subscriberRows.length,
        settings: settingRows.length,
      },
      data: {
        articles: articleRows,
        categories: categoryRows,
        subscribers: subscriberRows.map(row => ({
          ...row,
          consentToken: row.consentToken ? '[redacted]' : null,
          unsubscribeToken: row.unsubscribeToken ? '[redacted]' : null,
        })),
        settings: settingRows.map(row => ({ ...row, value: maskSetting(row.key, row.value) })),
      },
    }
    const body = Buffer.from(JSON.stringify(snapshot, null, 2))
    const uploaded = await uploadPrivateBackupToR2({
      body,
      filename: `thinkbiz-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    })

    const [updated] = await db.update(backupJobs).set({
      status: 'success',
      r2Key: uploaded.key,
      url: null,
      sizeBytes: body.byteLength,
      finishedAt: new Date(),
    }).where(eqBackupJob(job.id)).returning()

    return updated
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const [updated] = await db.update(backupJobs).set({
      status: 'failed',
      error: message,
      finishedAt: new Date(),
    }).where(eqBackupJob(job.id)).returning()

    await reportOperationalEvent({
      name: 'backup.failed',
      severity: 'error',
      message,
      context: { jobId: job.id, trigger },
    })

    return updated
  }
}

function eqBackupJob(id: string) {
  return eq(backupJobs.id, id)
}
