import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAllowedAdminEmail } from './auth'

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? ''

  if (!session || !isAllowedAdminEmail(email)) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { session, response: null }
}
