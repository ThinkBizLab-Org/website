export const dynamic = 'force-dynamic'

import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, publishAttempts } from '@/lib/schema'

export const metadata = { title: 'Audit Logs' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export default async function AuditPage() {
  let audits: (typeof auditLogs.$inferSelect)[] = []
  let attempts: (typeof publishAttempts.$inferSelect)[] = []

  try {
    audits = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(80)
    attempts = await db.select().from(publishAttempts).orderBy(desc(publishAttempts.createdAt)).limit(80)
  } catch {
    // DB unavailable during local setup.
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Audit Logs</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>กิจกรรมหลังบ้านและประวัติการ publish ล่าสุด</p>
      </div>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Publish Attempts</h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">เวลา</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Platform</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Mode</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {attempts.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.createdAt)}</td>
                  <td className="px-4 py-3 text-white">{item.platform}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: item.status === 'success' ? '#10B981' : item.status === 'failed' ? '#F87171' : '#F59E0B' }}>{item.status}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#A78BFA' }}>{item.mode}</td>
                  <td className="px-4 py-3 font-mono text-xs max-w-md truncate" style={{ color: '#9B8EC4' }}>{item.error ?? '-'}</td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี publish attempts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Admin Activity</h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">เวลา</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Actor</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Action</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {audits.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#A78BFA' }}>{item.actorEmail ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{item.action}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.entityType}:{item.entityId ?? '-'}</td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี audit logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
