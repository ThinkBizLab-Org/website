import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { categories } from '@/lib/schema'
import { asc } from 'drizzle-orm'
import { categoryInputSchema, validationError } from '@/lib/validators'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.order), asc(categories.name))
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  try {
    const parsed = categoryInputSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 })
    const body = parsed.data
    const name = body.name

    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const [created] = await db.insert(categories)
      .values({
        name,
        slug: body.slug || slug,
        description: body.description || null,
        color: body.color,
        order: body.order,
        updatedAt: new Date(),
      })
      .returning()

    await logAudit({ session, action: 'category.create', entityType: 'category', entityId: created.id, metadata: { name: created.name } })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const msg = String(e)
    if (msg.includes('unique')) return NextResponse.json({ error: 'ชื่อหรือ slug นี้มีอยู่แล้ว' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
