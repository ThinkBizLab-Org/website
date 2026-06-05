import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { socialPostQueue } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

const platforms = new Set(['line', 'facebook', 'instagram', 'tiktok'])

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const rows = await db.select().from(socialPostQueue).orderBy(desc(socialPostQueue.createdAt)).limit(200)
  return NextResponse.json({ ok: true, queue: rows })
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const articleId = String(body.articleId ?? '').trim() || null
  const platform = String(body.platform ?? '').trim()
  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null

  if (!platforms.has(platform)) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  const [item] = await db.insert(socialPostQueue).values({
    articleId,
    platform,
    status: 'queued',
    payload: body.payload ?? {},
    scheduledAt,
    updatedAt: new Date(),
  }).returning()

  await logAudit({
    session,
    action: 'social_queue.create',
    entityType: 'social_post_queue',
    entityId: item.id,
    metadata: { articleId, platform },
  })

  return NextResponse.json({ ok: true, item }, { status: 201 })
}
