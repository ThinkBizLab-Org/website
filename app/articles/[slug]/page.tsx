export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { and, desc, eq, ne } from 'drizzle-orm'
import { Navbar } from '@/components/Navbar'
import { AISummaryBox } from '@/components/AISummaryBox'
import { renderMarkdown } from '@/lib/markdown'
import { ArticleCard } from '@/components/ArticleCard'
import { ArticleViewTracker } from '@/components/ArticleViewTracker'
import { FollowCTA } from '@/components/FollowCTA'
import { ConsultCTA } from '@/components/ConsultCTA'
import { ShareButtons } from '@/components/ShareButtons'

// Real social profiles for E-E-A-T publisher/author sameAs signals.
const SOCIAL_SAME_AS = ['https://line.me/R/ti/p/@thinkbizlab']

function renderContent(content: string): string {
  // If content looks like HTML (from rich editor), use as-is
  if (content.trimStart().startsWith('<')) return content
  // Otherwise treat as Markdown (legacy articles)
  return renderMarkdown(content)
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const slug = decodeURIComponent(params.slug)
    const [article] = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
    if (!article) return { title: 'Not Found' }
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
    return {
      title: article.title,
      description: article.excerpt ?? undefined,
      alternates: { canonical: `${base}/articles/${article.slug}` },
      openGraph: {
        title: article.title,
        description: article.excerpt ?? undefined,
        url: `${base}/articles/${article.slug}`,
        type: 'article',
        locale: 'th_TH',
        images: article.coverImage ? [{ url: article.coverImage, width: 1200, height: 630 }] : [],
        publishedTime: article.publishedAt?.toISOString(),
        modifiedTime: article.updatedAt?.toISOString(),
        authors: ['ThinkBiz Lab'],
      },
      twitter: { card: 'summary_large_image', title: article.title, description: article.excerpt ?? undefined },
    }
  } catch {
    return { title: 'Article | ThinkBiz Lab' }
  }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  let article: typeof articles.$inferSelect | undefined
  let related: (typeof articles.$inferSelect)[] = []
  try {
    const slug = decodeURIComponent(params.slug)
    const [found] = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
    article = found
    if (found?.category) {
      related = await db.select().from(articles)
        .where(and(
          eq(articles.status, 'published'),
          eq(articles.category, found.category),
          ne(articles.id, found.id),
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(3)
    }
  } catch { /* DB not connected */ }

  if (!article) notFound()

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
  const faqItems = (article.faqJson as { q: string; a: string }[] | null) ?? []

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    author: { '@type': 'Organization', name: 'ThinkBiz Lab', url: base, sameAs: SOCIAL_SAME_AS },
    publisher: {
      '@type': 'Organization',
      name: 'ThinkBiz Lab',
      url: base,
      logo: { '@type': 'ImageObject', url: `${base}/brand/logo-light.svg` },
      sameAs: SOCIAL_SAME_AS,
    },
    datePublished: article.publishedAt?.toISOString(),
    dateModified:  article.updatedAt?.toISOString(),
    inLanguage: 'th-TH',
    image: article.coverImage,
    about: article.category ? { '@type': 'Thing', name: article.category } : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${base}/articles/${article.slug}` },
    keywords: article.tags?.join(', '),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าหลัก',  item: base },
      { '@type': 'ListItem', position: 2, name: 'บทความ',    item: `${base}/articles` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${base}/articles/${article.slug}` },
    ],
  }

  const faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null

  const htmlContent = article.content ? renderContent(article.content) : ''

  return (
    <div className="min-h-screen bg-dark text-white">
      <ArticleViewTracker articleId={article.id} slug={article.slug} />
      <Navbar />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      {/* Cover image */}
      {article.coverImage && (
        <div className="w-full pt-16 lg:pt-20" style={{ maxHeight: '480px', overflow: 'hidden' }}>
          <img src={article.coverImage} alt={article.title} className="w-full object-cover opacity-85" style={{ maxHeight: '480px' }} />
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pt-20 lg:pt-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-mono text-xs mb-8" style={{ color: 'rgba(155,142,196,.5)' }}>
          <Link href="/" className="hover:text-accent transition-colors">หน้าหลัก</Link>
          <span>/</span>
          <Link href="/articles" className="hover:text-accent transition-colors">บทความ</Link>
          {article.category && <><span>/</span><span className="text-purple">{article.category}</span></>}
        </nav>

        {/* Category + Tags */}
        {article.category && (
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-4">{article.category}</div>
        )}

        {/* Title */}
        <h1 className="font-heading font-black text-white leading-tight tracking-tight mb-5" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)' }}>
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs mb-8 pb-6" style={{ color: 'rgba(155,142,196,.6)', borderBottom: '1px solid rgba(124,58,237,.15)' }}>
          <span>โดย <span className="text-purple">ThinkBiz Lab</span></span>
          {article.publishedAt && (
            <span>{new Date(article.publishedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          )}
          <span>อ่าน {article.readTime} นาที</span>
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(124,58,237,.15)', color: '#A78BFA' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Share */}
        <div className="mb-8">
          <ShareButtons url={`${base}/articles/${article.slug}`} title={article.title} />
        </div>

        {/* AI Summary Box — GEO key element */}
        {article.aiSummaryQ && article.aiSummaryA && (
          <AISummaryBox
            question={article.aiSummaryQ}
            answer={article.aiSummaryA}
            keyPoints={article.keyPoints ?? []}
          />
        )}

        {/* Article body */}
        <article className="prose-article">
          {htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <p style={{ color: '#9B8EC4' }}>เนื้อหากำลังเตรียม...</p>
          )}
        </article>

        {/* FAQ Section — GEO key element */}
        {faqItems.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-white mb-5 pb-3" style={{ borderBottom: '1px solid rgba(124,58,237,.2)' }}>
              คำถามที่พบบ่อย (FAQ)
            </h2>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <details key={i} className="group rounded-xl border p-4 cursor-pointer" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(45,27,94,.25)' }}>
                  <summary className="font-heading font-semibold text-white text-base list-none flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-accent text-lg shrink-0">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: '#C4B5FD' }}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Follow / email capture — readers who finish convert best */}
        <FollowCTA segment={article.category ?? 'general'} />

        {/* Consult / lead conversion */}
        <div className="mt-6">
          <ConsultCTA compact source="article" interest={article.category ?? 'general'} articleId={article.id} />
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6" style={{ borderTop: '1px solid rgba(124,58,237,.12)' }}>
            {article.tags.map(tag => (
              <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}
                className="font-mono text-xs px-3 py-1 rounded-full border transition-colors hover:border-accent/50"
                style={{ borderColor: 'rgba(124,58,237,.25)', color: '#9B8EC4', background: 'rgba(45,27,94,.3)' }}>
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link href="/articles" className="inline-flex items-center gap-2 font-mono text-sm text-accent hover:underline">
            ← กลับไปยังบทความทั้งหมด
          </Link>
        </div>
      </main>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="pt-10 border-t" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
            <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-2">{'// RELATED'}</div>
            <h2 className="font-heading text-2xl font-bold text-white mb-6">บทความที่เกี่ยวข้อง</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map(item => <ArticleCard key={item.id} article={item} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
