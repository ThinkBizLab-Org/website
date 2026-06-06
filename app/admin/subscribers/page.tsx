export const dynamic = 'force-dynamic'

import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'
import { NewsletterPanel } from '@/components/NewsletterPanel'

export const metadata = { title: 'Subscribers' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export default async function SubscribersPage() {
  let rows: (typeof subscribers.$inferSelect)[] = []
  let byStatus: { status: string | null; value: number }[] = []
  let bySource: { source: string | null; value: number }[] = []
  let bySegment: { segment: string | null; value: number }[] = []

  try {
    rows = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(500)
    byStatus = await db.select({ status: subscribers.status, value: sql<number>`count(*)::int` }).from(subscribers).groupBy(subscribers.status)
    bySource = await db.select({ source: subscribers.source, value: sql<number>`count(*)::int` }).from(subscribers).groupBy(subscribers.source)
    bySegment = await db.select({ segment: subscribers.segment, value: sql<number>`count(*)::int` }).from(subscribers).groupBy(subscribers.segment)
  } catch {
    // DB unavailable during local setup.
  }

  const total = rows.length
  const active = byStatus.find(row => row.status === 'active')?.value ?? 0
  const pending = byStatus.find(row => row.status === 'pending')?.value ?? 0
  const unsubscribed = byStatus.find(row => row.status === 'unsubscribed')?.value ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">Subscribers</h1>
          <p className="text-sm" style={{ color: '#9B8EC4' }}>รายชื่อผู้สมัครรับข้อมูลจาก newsletter forms</p>
        </div>
        <a
          href="/api/admin/subscribers/export"
          className="bg-purple text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Export CSV
        </a>
      </div>

      <NewsletterPanel />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total', total, '#A78BFA'],
          ['Active', active, '#10B981'],
          ['Pending', pending, '#F59E0B'],
          ['Unsubscribed', unsubscribed, '#F87171'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-3xl font-bold mb-1" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      {bySource.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bySource.map(row => (
            <span key={row.source ?? 'unknown'} className="font-mono text-xs px-3 py-1.5 rounded-lg border" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.25)', background: 'rgba(124,58,237,.08)' }}>
              {row.source ?? 'unknown'}: {row.value}
            </span>
          ))}
          {bySegment.map(row => (
            <span key={`segment-${row.segment ?? 'unknown'}`} className="font-mono text-xs px-3 py-1.5 rounded-lg border" style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,.25)', background: 'rgba(56,189,248,.08)' }}>
              segment/{row.segment ?? 'unknown'}: {row.value}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Email</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Segment</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Source</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">Confirmed</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-xs text-accent">{row.email}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[10px] px-2 py-1 rounded" style={{ color: row.status === 'active' ? '#10B981' : row.status === 'unsubscribed' ? '#F87171' : '#F59E0B', background: row.status === 'active' ? 'rgba(16,185,129,.12)' : row.status === 'unsubscribed' ? 'rgba(248,113,113,.12)' : 'rgba(245,158,11,.12)' }}>
                    {row.status ?? 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#38BDF8' }}>{row.segment ?? 'general'}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{row.source ?? '-'}</td>
                <td className="px-4 py-3 font-mono text-xs hidden md:table-cell" style={{ color: '#9B8EC4' }}>{fmt(row.confirmedAt)}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(row.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี subscribers</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
