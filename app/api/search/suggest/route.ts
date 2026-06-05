import { ilike, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ ok: true, articles: [], tags: [], categories: [] })

  const term = `%${q}%`
  let rows: (typeof articles.$inferSelect)[] = []

  try {
    rows = await db.select().from(articles)
      .where(or(
        ilike(articles.title, term),
        ilike(articles.excerpt, term),
        ilike(articles.category, term),
      )!)
      .limit(12)
  } catch {
    rows = []
  }

  const published = rows.filter(row => row.status === 'published')
  const tags = Array.from(new Set(published.flatMap(row => row.tags ?? []).filter(tag => tag.toLowerCase().includes(q.toLowerCase())))).slice(0, 8)
  const categories = Array.from(new Set(published.map(row => row.category).filter(Boolean))).slice(0, 8)

  return NextResponse.json({
    ok: true,
    articles: published.slice(0, 8).map(row => ({
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      category: row.category,
    })),
    tags,
    categories,
  })
}
