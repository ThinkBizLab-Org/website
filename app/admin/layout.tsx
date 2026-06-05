import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminShell } from '@/components/AdminShell'

export const metadata = { title: { default: 'Admin | ThinkBiz Lab', template: '%s — Admin' } }

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null

  return <AdminShell user={user}>{children}</AdminShell>
}
