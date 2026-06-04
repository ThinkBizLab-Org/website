import { eq } from 'drizzle-orm'
import { db } from './db'
import { adminUsers } from './schema'
import { isAllowedAdminEmail } from './auth'

export type AdminRole = 'owner' | 'admin' | 'editor' | 'viewer'

const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 10,
  editor: 20,
  admin: 30,
  owner: 40,
}

function parseRole(value: string | null | undefined): AdminRole {
  if (value === 'owner' || value === 'admin' || value === 'editor' || value === 'viewer') return value
  return 'viewer'
}

export function canRole(role: AdminRole, required: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required]
}

export function fallbackRoleForEmail(email: string | null | undefined): AdminRole | null {
  if (!email || !isAllowedAdminEmail(email)) return null
  const firstAdmin = (process.env.ADMIN_EMAILS ?? '').split(',').map(v => v.trim()).filter(Boolean)[0]
  return firstAdmin && firstAdmin === email ? 'owner' : 'admin'
}

export async function getAdminRole(email: string | null | undefined): Promise<AdminRole | null> {
  if (!email || !isAllowedAdminEmail(email)) return null

  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
    if (user && user.active !== false) return parseRole(user.role)
  } catch {
    // During initial migration, fall back to ADMIN_EMAILS so existing admin access keeps working.
  }

  return fallbackRoleForEmail(email)
}

export function listRoleOptions(): AdminRole[] {
  return ['owner', 'admin', 'editor', 'viewer']
}
