import { NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { articleStatusSchema } from '@/lib/validators'

export async function PATCH(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean).slice(0, 200) : []
  const action = String(body.action ?? '')
  const now = new Date()

  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  if (action === 'delete') {
    const admin = await requireAdmin('admin')
    if (admin.response) return admin.response
    await db.delete(articles).where(inArray(articles.id, ids))
  } else if (action === 'set-status') {
    const parsed = articleStatusSchema.safeParse(body.status)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    await db.update(articles).set({
      status: parsed.data,
      publishedAt: parsed.data === 'published' ? now : null,
      updatedAt: now,
    }).where(inArray(articles.id, ids))
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await logAudit({
    session,
    action: `article.bulk.${action}`,
    entityType: 'article',
    metadata: { ids, status: body.status },
  })

  return NextResponse.json({ ok: true, count: ids.length })
}
