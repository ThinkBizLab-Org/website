import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'

  let published: { slug: string; updatedAt: Date | null }[] = []
  let categoryRows: { category: string | null }[] = []
  try {
    published = await db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.status, 'published'))
    categoryRows = await db
      .selectDistinct({ category: articles.category })
      .from(articles)
      .where(eq(articles.status, 'published'))
  } catch { /* DB not yet connected — return static routes only */ }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                     lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/articles`,        lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/categories`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/about`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/services`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.5 },
  ]

  const articleRoutes: MetadataRoute.Sitemap = published.map(a => ({
    url: `${base}/articles/${a.slug}`,
    lastModified: a.updatedAt ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = categoryRows
    .filter(row => row.category)
    .map(row => ({
      url: `${base}/articles?category=${encodeURIComponent(row.category!)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  return [...staticRoutes, ...articleRoutes, ...categoryRoutes]
}
