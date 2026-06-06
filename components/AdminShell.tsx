'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AdminUser } from '@/components/AdminUser'

type AdminShellUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type AdminShellProps = {
  children: ReactNode
  user?: AdminShellUser | null
}

const navItems = [
  ['📊', 'Dashboard', '/admin'],
  ['🏭', 'Content Factory', '/admin/content-factory'],
  ['📅', 'Content Calendar', '/admin/calendar'],
  ['📝', 'บทความ', '/admin/articles'],
  ['➕', 'เพิ่มบทความ', '/admin/articles/new'],
  ['🏷️', 'หมวดหมู่', '/admin/categories'],
  ['🖼️', 'Media Library', '/admin/media'],
  ['🎬', 'Media Queue', '/admin/media-production'],
  ['🎥', 'Video Review', '/admin/videos'],
  ['✉️', 'Subscribers', '/admin/subscribers'],
  ['📥', 'Leads', '/admin/leads'],
  ['📈', 'Analytics', '/admin/analytics'],
  ['🔗', 'Link Checker', '/admin/link-checker'],
  ['🩺', 'Monitoring', '/admin/monitoring'],
  ['🧰', 'System Status', '/admin/system'],
  ['📣', 'Social Queue', '/admin/social-queue'],
  ['💀', 'Dead Letter Queue', '/admin/dead-letter-queue'],
  ['🔔', 'Notifications', '/admin/notifications'],
  ['🎙️', 'Brand Voice', '/admin/brand-voice'],
  ['🔗', 'UTM Builder', '/admin/utm'],
  ['💸', 'AI Cost & Usage', '/admin/ai-usage'],
  ['🧾', 'Audit Logs', '/admin/audit'],
  ['🎵', 'TikTok Auth', '/admin/tiktok'],
  ['👥', 'Admin Users', '/admin/users'],
  ['⚙️', 'Settings', '/admin/settings'],
] as const

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname()
  const [pendingRoute, setPendingRoute] = useState<{ href: string, from: string } | null>(null)
  const [settling, setSettling] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLoading = Boolean(pendingRoute) || settling
  const activeHref = useMemo(() => {
    return [...navItems]
      .sort((a, b) => b[2].length - a[2].length)
      .find(([, , href]) => href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))?.[2]
  }, [pathname])

  useEffect(() => {
    if (!pendingRoute) return

    const fallback = setTimeout(() => setPendingRoute(null), 8000)
    const reachedTarget = pathname === pendingRoute.href || pathname.startsWith(`${pendingRoute.href}/`)
    if (pathname !== pendingRoute.from && reachedTarget) {
      setPendingRoute(null)
      setSettling(true)
      timeoutRef.current = setTimeout(() => setSettling(false), 220)
    }
    return () => clearTimeout(fallback)
  }, [pathname, pendingRoute])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const userInitial = useMemo(() => user?.name?.[0] ?? user?.email?.[0] ?? '?', [user])

  function beginNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === '_blank'
    ) return

    if (href === pathname) return
    setPendingRoute({ href, from: pathname })
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0812', fontFamily: 'var(--font-sarabun)' }}>
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r" style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(15,13,26,.8)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
          <Link href="/admin" onClick={(event) => beginNavigation(event, '/admin')} className="flex items-center gap-2">
            <span className="font-heading font-bold text-white text-sm">Think<span className="text-accent">Biz</span></span>
            <span className="font-mono text-[9px] text-accent border border-purple/40 px-1.5 py-0.5 rounded" style={{ background: 'rgba(45,27,94,.5)' }}>ADMIN</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Admin navigation">
          {navItems.map(([icon, label, href]) => {
            const active = activeHref === href
            const pending = pendingRoute?.href === href

            return (
              <Link
                key={href}
                href={href}
                onClick={(event) => beginNavigation(event, href)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active ? 'text-white bg-purple/15' : 'hover:text-white hover:bg-purple/10',
                ].join(' ')}
                style={{ color: active ? '#F5F3FF' : '#9B8EC4' }}
              >
                <span className="w-5 shrink-0">{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                {pending && <span className="w-3 h-3 rounded-full border-2 border-accent/30 border-t-accent animate-spin" aria-hidden="true" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
          {user && (
            <div className="flex items-center gap-3">
              {user.image ? (
                <img src={user.image} alt="" className="w-8 h-8 rounded-full ring-2 ring-purple/30" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7C3AED' }}>
                  {userInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="font-mono text-[10px] truncate" style={{ color: 'rgba(155,142,196,.5)' }}>{user.email}</div>
              </div>
            </div>
          )}
          <AdminUser />
          <Link href="/" className="flex items-center gap-2 text-xs font-mono transition-colors hover:text-accent" style={{ color: 'rgba(155,142,196,.4)' }}>
            ← กลับเว็บไซต์
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(124,58,237,.12)', background: 'rgba(15,13,26,.8)' }}>
          <div className="flex items-center gap-2">
            {user?.image && <img src={user.image} alt="" className="w-7 h-7 rounded-full" />}
            <span className="font-heading font-bold text-white text-sm">Think<span className="text-accent">Biz</span> <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>ADMIN</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/articles/new" onClick={(event) => beginNavigation(event, '/admin/articles/new')} className="text-xs bg-purple text-white px-3 py-1.5 rounded-lg">+ บทความ</Link>
            <AdminUser compact />
          </div>
        </div>

        <div className="relative flex-1 p-4 lg:p-8 overflow-auto">
          {isLoading && <AdminLoadingOverlay />}
          {children}
        </div>
      </div>
    </div>
  )
}

function AdminLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A0812]/45 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading admin page"
    >
      <div className="flex items-center gap-3 rounded-lg border border-purple/25 bg-[#0F0D1A]/95 px-4 py-3 shadow-2xl shadow-purple/10">
        <span className="w-5 h-5 rounded-full border-2 border-accent/25 border-t-accent animate-spin" aria-hidden="true" />
        <span className="font-mono text-xs text-accent">Loading</span>
      </div>
    </div>
  )
}
