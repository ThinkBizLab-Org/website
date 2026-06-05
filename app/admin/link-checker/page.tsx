export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { linkCheckResults } from '@/lib/schema'
import { LinkCheckerActions } from '@/components/LinkCheckerActions'

export const metadata = { title: 'Link Checker' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function statusColor(status: string) {
  if (status === 'broken') return '#F87171'
  if (status === 'warning') return '#F59E0B'
  if (status === 'ok') return '#10B981'
  return '#9B8EC4'
}

export default async function LinkCheckerPage() {
  let rows: (typeof linkCheckResults.$inferSelect)[] = []
  try {
    rows = await db.select().from(linkCheckResults).orderBy(desc(linkCheckResults.checkedAt)).limit(500)
  } catch {
    // DB unavailable or migration not applied yet.
  }

  const stats = {
    total: rows.length,
    broken: rows.filter(row => row.status === 'broken').length,
    warnings: rows.filter(row => row.status === 'warning').length,
    ok: rows.filter(row => row.status === 'ok').length,
  }
  const lastChecked = rows[0]?.checkedAt ?? null

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">Broken Link Checker</h1>
          <p className="text-sm" style={{ color: '#9B8EC4' }}>ตรวจลิงก์ในเนื้อหาบทความและเก็บผล scan ล่าสุด</p>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(155,142,196,.55)' }}>Last checked: {fmt(lastChecked)}</p>
        </div>
        <LinkCheckerActions />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total links', stats.total, '#A78BFA'],
          ['Broken', stats.broken, '#F87171'],
          ['Warnings', stats.warnings, '#F59E0B'],
          ['OK', stats.ok, '#10B981'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-3xl font-bold mb-1" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Results</h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Article</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">URL</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">Error</th>
                <th className="text-right px-4 py-3 font-mono text-xs text-purple hidden lg:table-cell">Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="px-4 py-3 align-top">
                    <span className="font-mono text-[10px] font-bold uppercase" style={{ color: statusColor(row.status) }}>{row.status}</span>
                    {row.statusCode && <div className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>{row.statusCode}</div>}
                  </td>
                  <td className="px-4 py-3 align-top text-white">
                    {row.articleId
                      ? <Link href={`/admin/articles/${row.articleId}`} className="hover:text-accent">{row.articleTitle ?? row.articleSlug ?? row.articleId}</Link>
                      : (row.articleTitle ?? '-')}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <a href={row.normalizedUrl} target="_blank" rel="noopener" className="font-mono text-xs text-accent hover:underline break-all">{row.url}</a>
                    <div className="font-mono text-[10px] mt-1" style={{ color: 'rgba(155,142,196,.5)' }}>{row.linkType}</div>
                  </td>
                  <td className="px-4 py-3 align-top hidden md:table-cell font-mono text-xs max-w-sm" style={{ color: '#9B8EC4' }}>{row.error ?? '-'}</td>
                  <td className="px-4 py-3 align-top hidden lg:table-cell text-right font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>{fmt(row.checkedAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มีผล scan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
