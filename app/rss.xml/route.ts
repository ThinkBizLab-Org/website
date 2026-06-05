import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com').replace(/\/+$/, '')
  let rows: (typeof articles.$inferSelect)[] = []
  try {
    rows = await db.select().from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt))
      .limit(50)
  } catch {
    rows = []
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ThinkBiz Lab</title>
    <link>${base}</link>
    <description>ห้องทดลองความคิดธุรกิจ</description>
    <language>th-TH</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
    ${rows.map(article => `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${base}/articles/${encodeURIComponent(article.slug)}</link>
      <guid>${base}/articles/${encodeURIComponent(article.slug)}</guid>
      <description>${escapeXml(article.excerpt ?? '')}</description>
      <pubDate>${(article.publishedAt ?? article.updatedAt ?? article.createdAt ?? new Date()).toUTCString()}</pubDate>
    </item>`).join('')}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
