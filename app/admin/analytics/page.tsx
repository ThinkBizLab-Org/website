export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getContentPerformanceDashboard, maxValue } from '@/lib/content-performance'
import { StaleContentPanel } from '@/components/StaleContentPanel'

export const metadata = { title: 'Content Performance' }

function fmt(date: Date | string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function shortDate(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function statusColor(status: string | null) {
  if (status === 'published') return '#10B981'
  if (status === 'approved') return '#38BDF8'
  if (status === 'review') return '#F59E0B'
  return '#9B8EC4'
}

export default async function AnalyticsPage() {
  let data: Awaited<ReturnType<typeof getContentPerformanceDashboard>> | null = null

  try {
    data = await getContentPerformanceDashboard()
  } catch {
    // DB unavailable during local setup or migrations not applied yet.
  }

  const summary = data?.summary ?? {
    totalViews: 0,
    viewsToday: 0,
    views7d: 0,
    views30d: 0,
    trackedArticles: 0,
    publishedArticles: 0,
  }
  const trend = data?.trend ?? []
  const articles = data?.articles ?? []
  const categories = data?.categories ?? []
  const referrers = data?.referrers ?? []
  const recent = data?.recent ?? []
  const trendMax = maxValue(trend)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">Content Performance</h1>
          <p className="text-sm" style={{ color: '#9B8EC4' }}>First-party article views, topic demand, referrers, and recent traffic</p>
        </div>
        <Link href="/admin/content-factory" className="font-mono text-xs text-accent hover:underline">open content factory</Link>
      </div>

      <StaleContentPanel />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          ['Total views', summary.totalViews, '#A78BFA'],
          ['Today', summary.viewsToday, '#10B981'],
          ['7 days', summary.views7d, '#38BDF8'],
          ['30 days', summary.views30d, '#F59E0B'],
          ['Tracked', summary.trackedArticles, '#F472B6'],
          ['Published', summary.publishedArticles, '#34D399'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-2xl font-bold mb-1" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-heading text-lg font-bold text-white">14-Day View Trend</h2>
          <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>{summary.views7d} views last 7 days</span>
        </div>
        <div className="flex items-end gap-2 h-44">
          {trend.map(row => (
            <div key={row.day} className="flex-1 min-w-0 flex flex-col items-center gap-2">
              <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(6, (row.views / trendMax) * 150)}px`, background: 'linear-gradient(180deg, #A78BFA, #38BDF8)' }} />
              <div className="font-mono text-[9px] text-center truncate w-full" style={{ color: '#9B8EC4' }}>{shortDate(row.day)}</div>
              <div className="font-mono text-[9px]" style={{ color: '#C4B5FD' }}>{row.views}</div>
            </div>
          ))}
          {trend.length === 0 && <div className="w-full text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี trend data</div>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="Category Demand" subtitle="last 30 days" rows={categories} />
        <Breakdown title="Traffic Sources" subtitle="last 30 days" rows={referrers} />
      </div>

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-heading text-lg font-bold text-white">Top Performing Articles</h2>
          <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>ranked by 30-day views</span>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Article</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Category</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
                <th className="text-right px-4 py-3 font-mono text-xs text-purple">7d</th>
                <th className="text-right px-4 py-3 font-mono text-xs text-purple">30d</th>
                <th className="text-right px-4 py-3 font-mono text-xs text-purple">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {articles.map(item => (
                <tr key={`${item.articleId ?? item.slug}`}>
                  <td className="px-4 py-3 text-white">
                    <div className="font-semibold">
                      {item.articleId ? <Link href={`/admin/articles/${item.articleId}`} className="hover:text-accent">{item.title ?? item.slug}</Link> : (item.title ?? item.slug)}
                    </div>
                    <div className="font-mono text-[10px] truncate max-w-sm" style={{ color: '#9B8EC4' }}>{item.slug} · {fmt(item.publishedAt)}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.category ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: statusColor(item.status) }}>{item.status ?? 'unknown'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: '#38BDF8' }}>{item.views7d}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-accent">{item.views30d}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: '#C4B5FD' }}>{item.totalViews}</td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี analytics data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Recent Traffic</h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Time</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Path</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {recent.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-accent">{item.path}</td>
                  <td className="px-4 py-3 font-mono text-xs max-w-md truncate" style={{ color: '#9B8EC4' }}>{item.referrer ?? '-'}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี recent views</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Breakdown({ title, subtitle, rows }: { title: string; subtitle: string; rows: { label: string; value: number }[] }) {
  const max = maxValue(rows)
  return (
    <section className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-heading text-lg font-bold text-white">{title}</h2>
        <span className="font-mono text-xs" style={{ color: '#9B8EC4' }}>{subtitle}</span>
      </div>
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-sm text-white truncate">{row.label}</span>
              <span className="font-mono text-xs text-accent">{row.value}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(4, (row.value / max) * 100)}%`, background: 'linear-gradient(90deg, #7C3AED, #10B981)' }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="font-mono text-xs text-center py-8" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มีข้อมูล</div>}
      </div>
    </section>
  )
}
