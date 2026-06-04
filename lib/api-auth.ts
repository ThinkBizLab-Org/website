import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAllowedAdminEmail } from './auth'
import { type AdminRole, canRole, getAdminRole } from './rbac'

export async function requireAdmin(requiredRole: AdminRole = 'viewer') {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? ''
  const role = await getAdminRole(email)

  if (!session || !isAllowedAdminEmail(email) || !role || !canRole(role, requiredRole)) {
    return {
      session: null,
      role: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: session ? 403 : 401 }),
    }
  }

  return { session, role, response: null }
}
