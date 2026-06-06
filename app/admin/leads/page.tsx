export const dynamic = 'force-dynamic'

import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads } from '@/lib/schema'
import { LeadStatusSelect } from '@/components/LeadStatusSelect'

export const metadata = { title: 'Leads' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export default async function LeadsPage() {
  let rows: (typeof leads.$inferSelect)[] = []
  let byStatus: { status: string | null; value: number }[] = []
  try {
    rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(500)
    byStatus = await db.select({ status: leads.status, value: sql<number>`count(*)::int` }).from(leads).groupBy(leads.status)
  } catch {
    // DB unavailable during local setup.
  }

  const count = (s: string) => byStatus.find(r => r.status === s)?.value ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Leads</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>คำขอปรึกษา/ติดต่อจากเว็บไซต์ — จัดการสถานะการติดตาม</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['New', count('new'), '#F59E0B'],
          ['Contacted', count('contacted'), '#38BDF8'],
          ['Qualified', count('qualified'), '#A78BFA'],
          ['Won', count('won'), '#10B981'],
          ['Lost', count('lost'), '#F87171'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-3xl font-bold mb-1" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">ชื่อ / บริษัท</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">ติดต่อ</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">สนใจ</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden lg:table-cell">ข้อความ</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">สถานะ</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="text-white">{row.name || '-'}</div>
                  {row.company && <div className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>{row.company}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <div className="text-accent">{row.email}</div>
                  {row.phone && <div style={{ color: '#9B8EC4' }}>{row.phone}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs hidden md:table-cell" style={{ color: '#38BDF8' }}>{row.interest ?? '-'}</td>
                <td className="px-4 py-3 text-xs hidden lg:table-cell max-w-xs truncate" style={{ color: '#C4B5FD' }}>{row.message ?? '-'}</td>
                <td className="px-4 py-3"><LeadStatusSelect leadId={row.id} status={row.status} /></td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(row.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี leads</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
