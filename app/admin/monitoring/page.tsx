export const dynamic = 'force-dynamic'

import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { operationalEvents } from '@/lib/schema'
import { MonitoringActions } from '@/components/MonitoringActions'

export const metadata = { title: 'Monitoring' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function color(severity: string) {
  if (severity === 'error') return '#F87171'
  if (severity === 'warning') return '#F59E0B'
  return '#38BDF8'
}

export default async function MonitoringPage() {
  let rows: (typeof operationalEvents.$inferSelect)[] = []
  try {
    rows = await db.select().from(operationalEvents).orderBy(desc(operationalEvents.createdAt)).limit(200)
  } catch {
    // DB unavailable or migration not applied.
  }

  const errors = rows.filter(row => row.severity === 'error').length
  const warnings = rows.filter(row => row.severity === 'warning').length

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">Monitoring</h1>
          <p className="text-sm" style={{ color: '#9B8EC4' }}>Operational events, browser errors และ webhook delivery</p>
        </div>
        <MonitoringActions />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Events', rows.length, '#A78BFA'],
          ['Errors', errors, '#F87171'],
          ['Warnings', warnings, '#F59E0B'],
          ['Latest', fmt(rows[0]?.createdAt ?? null), '#38BDF8'],
        ].map(([label, value, itemColor]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-2xl font-bold mb-1 break-words" style={{ color: String(itemColor) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Severity</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Event</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">Message</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-4 py-3 align-top font-mono text-[10px] uppercase font-bold" style={{ color: color(row.severity) }}>{row.severity}</td>
                <td className="px-4 py-3 align-top">
                  <div className="font-mono text-xs text-accent">{row.name}</div>
                  <div className="md:hidden font-mono text-[10px] mt-1" style={{ color: '#9B8EC4' }}>{row.message}</div>
                </td>
                <td className="px-4 py-3 align-top hidden md:table-cell font-mono text-xs max-w-xl truncate" style={{ color: '#9B8EC4' }}>{row.message}</td>
                <td className="px-4 py-3 align-top text-right font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>{fmt(row.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี monitoring events</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
