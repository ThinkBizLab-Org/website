import Link from 'next/link'
import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminUser } from '@/components/AdminUser'

export const metadata = { title: { default: 'Admin | ThinkBiz Lab', template: '%s — Admin' } }

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0812', fontFamily: 'var(--font-sarabun)' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r" style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(15,13,26,.8)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-heading font-bold text-white text-sm">Think<span className="text-accent">Biz</span></span>
            <span className="font-mono text-[9px] text-accent border border-purple/40 px-1.5 py-0.5 rounded" style={{ background: 'rgba(45,27,94,.5)' }}>ADMIN</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            ['📊', 'Dashboard',        '/admin'],
            ['📅', 'Content Calendar', '/admin/calendar'],
            ['📝', 'บทความ',            '/admin/articles'],
            ['➕', 'เพิ่มบทความ',       '/admin/articles/new'],
            ['🏷️', 'หมวดหมู่',          '/admin/categories'],
            ['🖼️', 'Media Library',      '/admin/media'],
            ['✉️', 'Subscribers',        '/admin/subscribers'],
            ['📈', 'Analytics',          '/admin/analytics'],
            ['🔗', 'Link Checker',       '/admin/link-checker'],
            ['🩺', 'Monitoring',         '/admin/monitoring'],
            ['📣', 'Social Queue',       '/admin/social-queue'],
            ['🧾', 'Audit Logs',        '/admin/audit'],
            ['🎵', 'TikTok Auth',       '/admin/tiktok'],
            ['👥', 'Admin Users',       '/admin/users'],
            ['⚙️', 'Settings',          '/admin/settings'],
          ].map(([icon, label, href]) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:text-white hover:bg-purple/10"
              style={{ color: '#9B8EC4' }}>
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full ring-2 ring-purple/30" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: '#7C3AED' }}>
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{session.user.name}</div>
                <div className="font-mono text-[10px] truncate" style={{ color: 'rgba(155,142,196,.5)' }}>{session.user.email}</div>
              </div>
            </div>
          )}
          <AdminUser />
          <Link href="/" className="flex items-center gap-2 text-xs font-mono transition-colors hover:text-accent" style={{ color: 'rgba(155,142,196,.4)' }}>
            ← กลับเว็บไซต์
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(124,58,237,.12)', background: 'rgba(15,13,26,.8)' }}>
          <div className="flex items-center gap-2">
            {session?.user?.image && (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            )}
            <span className="font-heading font-bold text-white text-sm">Think<span className="text-accent">Biz</span> <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>ADMIN</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/articles/new" className="text-xs bg-purple text-white px-3 py-1.5 rounded-lg">+ บทความ</Link>
            <AdminUser compact />
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
