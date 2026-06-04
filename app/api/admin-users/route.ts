import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { listRoleOptions } from '@/lib/rbac'

const roles = new Set(listRoleOptions())

export async function GET() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  try {
    const users = await db.select().from(adminUsers).orderBy(asc(adminUsers.email))
    return NextResponse.json({ ok: true, users })
  } catch (error) {
    return NextResponse.json({ error: String(error), users: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('owner')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim() || null
  const role = String(body.role ?? 'editor')
  const active = body.active !== false

  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (!roles.has(role as never)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const [user] = await db.insert(adminUsers)
    .values({ email, name, role, active, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: adminUsers.email,
      set: { name, role, active, updatedAt: new Date() },
    })
    .returning()

  await logAudit({
    actorEmail: session?.user?.email,
    action: 'admin_user.upsert',
    entityType: 'admin_user',
    entityId: email,
    metadata: { role, active },
  })

  return NextResponse.json({ ok: true, user })
}
