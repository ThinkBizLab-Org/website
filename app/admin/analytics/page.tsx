export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articlePageViews, articles } from '@/lib/schema'

export const metadata = { title: 'Analytics' }

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export default async function AnalyticsPage() {
  let totalViews = 0
  let viewsToday = 0
  let topArticles: { articleId: string | null; slug: string; title: string | null; views: number }[] = []
  let recent: (typeof articlePageViews.$inferSelect)[] = []

  try {
    const [total] = await db.select({ value: sql<number>`count(*)::int` }).from(articlePageViews)
    const [today] = await db.select({ value: sql<number>`count(*)::int` })
      .from(articlePageViews)
      .where(sql`${articlePageViews.createdAt} >= date_trunc('day', now())`)

    totalViews = total?.value ?? 0
    viewsToday = today?.value ?? 0

    topArticles = await db.select({
      articleId: articlePageViews.articleId,
      slug: articlePageViews.slug,
      title: sql<string | null>`max(${articles.title})`,
      views: sql<number>`count(*)::int`,
    })
      .from(articlePageViews)
      .leftJoin(articles, sql`${articles.id} = ${articlePageViews.articleId}`)
      .groupBy(articlePageViews.articleId, articlePageViews.slug)
      .orderBy(desc(sql`count(*)`))
      .limit(20)

    recent = await db.select().from(articlePageViews).orderBy(desc(articlePageViews.createdAt)).limit(80)
  } catch {
    // DB unavailable during local setup or migration not applied yet.
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Article Analytics</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>First-party page view tracking สำหรับบทความ</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total views', totalViews, '#A78BFA'],
          ['Today', viewsToday, '#10B981'],
          ['Tracked articles', topArticles.length, '#38BDF8'],
          ['Recent rows', recent.length, '#F59E0B'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-3xl font-bold mb-1" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Top Articles</h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Article</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Slug</th>
                <th className="text-right px-4 py-3 font-mono text-xs text-purple">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {topArticles.map(item => (
                <tr key={`${item.articleId ?? item.slug}`}>
                  <td className="px-4 py-3 text-white">
                    {item.articleId ? <Link href={`/admin/articles/${item.articleId}`} className="hover:text-accent">{item.title ?? item.slug}</Link> : (item.title ?? item.slug)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.slug}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-accent">{item.views}</td>
                </tr>
              ))}
              {topArticles.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี analytics data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Recent Views</h2>
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
