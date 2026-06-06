import { and, eq, or, sql, desc } from 'drizzle-orm'
import { db } from './db'
import { articles } from './schema'

// Site-wide reader search across title, excerpt, content, tags, and category,
// with a simple relevance score (title matches rank highest).

export type SearchableArticle = {
  title: string | null
  excerpt: string | null
  content: string | null
  category: string | null
  tags: string[] | null
}

export type SearchResult = {
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  coverImage: string | null
  publishedAt: Date | string | null
  score: number
}

const FIELD_WEIGHTS: { field: keyof SearchableArticle; weight: number }[] = [
  { field: 'title', weight: 10 },
  { field: 'tags', weight: 6 },
  { field: 'category', weight: 5 },
  { field: 'excerpt', weight: 3 },
  { field: 'content', weight: 1 },
]

export function normalizeQuery(raw: string): string[] {
  return raw.toLowerCase().split(/\s+/).map(t => t.trim()).filter(t => t.length >= 2)
}

// Pure: scores an article for the given lowercased terms. Each term contributes
// its highest-weighted field hit, so a title match dominates a body match.
export function scoreArticleMatch(article: SearchableArticle, terms: string[]): number {
  if (terms.length === 0) return 0
  let score = 0
  for (const term of terms) {
    let best = 0
    for (const { field, weight } of FIELD_WEIGHTS) {
      const value = field === 'tags' ? (article.tags ?? []).join(' ') : (article[field] ?? '')
      if (typeof value === 'string' && value.toLowerCase().includes(term)) {
        best = Math.max(best, weight)
      }
    }
    score += best
  }
  return score
}

// Pure: scores and sorts candidates, dropping non-matches.
export function rankSearchResults<T extends SearchableArticle>(rows: T[], query: string): (T & { score: number })[] {
  const terms = normalizeQuery(query)
  return rows
    .map(row => ({ ...row, score: scoreArticleMatch(row, terms) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
}

export async function searchPublishedArticles(query: string, limit = 20): Promise<SearchResult[]> {
  const terms = normalizeQuery(query)
  if (terms.length === 0) return []

  // Pull candidates that match any term in any searchable field, then rank in JS.
  const termConditions = terms.map(term => {
    const like = `%${term}%`
    return or(
      sql`${articles.title} ilike ${like}`,
      sql`${articles.excerpt} ilike ${like}`,
      sql`${articles.content} ilike ${like}`,
      sql`${articles.category} ilike ${like}`,
      sql`array_to_string(coalesce(${articles.tags}, '{}'), ' ') ilike ${like}`,
    )
  })

  const rows = await db.select({
    title: articles.title,
    slug: articles.slug,
    excerpt: articles.excerpt,
    content: articles.content,
    category: articles.category,
    tags: articles.tags,
    coverImage: articles.coverImage,
    publishedAt: articles.publishedAt,
  })
    .from(articles)
    .where(and(eq(articles.status, 'published'), or(...termConditions)))
    .orderBy(desc(articles.publishedAt))
    .limit(100)

  return rankSearchResults(rows, query)
    .slice(0, limit)
    .map(row => ({
      title: row.title ?? '',
      slug: row.slug,
      excerpt: row.excerpt,
      category: row.category,
      coverImage: row.coverImage,
      publishedAt: row.publishedAt,
      score: row.score,
    }))
}
