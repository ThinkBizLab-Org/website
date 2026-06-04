import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { categories, articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { categoryInputSchema, validationError } from '@/lib/validators'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  try {
    const parsed = categoryInputSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 })
    const body = parsed.data
    const name = body.name

    const slug = body.slug || name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const [updated] = await db.update(categories)
      .set({
        name,
        slug,
        description: body.description || null,
        color: body.color,
        order: body.order,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, params.id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logAudit({ session, action: 'category.update', entityType: 'category', entityId: updated.id, metadata: { name: updated.name } })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const msg = String(e)
    if (msg.includes('unique')) return NextResponse.json({ error: 'ชื่อหรือ slug นี้มีอยู่แล้ว' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('admin')
  if (response) return response

  try {
    // Check if any articles use this category
    const [cat] = await db.select().from(categories).where(eq(categories.id, params.id))
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const usedBy = await db.select({ id: articles.id }).from(articles)
      .where(eq(articles.category, cat.name))

    if (usedBy.length > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ — มีบทความ ${usedBy.length} บทความที่ใช้หมวดหมู่นี้` },
        { status: 409 },
      )
    }

    await db.delete(categories).where(eq(categories.id, params.id))
    await logAudit({ session, action: 'category.delete', entityType: 'category', entityId: params.id, metadata: { name: cat.name } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
