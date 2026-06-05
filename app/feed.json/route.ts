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

  return Response.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'ThinkBiz Lab',
    home_page_url: base,
    feed_url: `${base}/feed.json`,
    language: 'th-TH',
    description: 'ห้องทดลองความคิดธุรกิจ',
    items: rows.map(article => ({
      id: `${base}/articles/${article.slug}`,
      url: `${base}/articles/${article.slug}`,
      title: article.title,
      summary: article.excerpt,
      image: article.coverImage,
      tags: article.tags ?? [],
      date_published: article.publishedAt?.toISOString(),
      date_modified: article.updatedAt?.toISOString(),
    })),
  })
}
