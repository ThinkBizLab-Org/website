import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('owner')
  if (response) return response

  const [user] = await db.delete(adminUsers).where(eq(adminUsers.id, params.id)).returning()
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logAudit({
    actorEmail: session?.user?.email,
    action: 'admin_user.delete',
    entityType: 'admin_user',
    entityId: user.email,
  })

  return NextResponse.json({ ok: true })
}
