import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { Navbar } from '@/components/Navbar'
import { ArticleCard } from '@/components/ArticleCard'
import { ArticleSearchBox } from '@/components/ArticleSearchBox'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'บทความ | ThinkBiz Lab',
  description: 'รวมบทความธุรกิจ กลยุทธ์ การเงิน การตลาด Startup SME และ AI สำหรับผู้ประกอบการไทย',
}

const CATEGORIES = [
  { icon: '📊', name: 'Strategy' },
  { icon: '💰', name: 'Finance' },
  { icon: '📣', name: 'Marketing' },
  { icon: '🚀', name: 'Startup' },
  { icon: '🏪', name: 'SME' },
  { icon: '📈', name: 'Investment' },
  { icon: '🤖', name: 'AI & Tech' },
  { icon: '🌏', name: 'Global Case' },
]

const PAGE_SIZE = 12

function pageHref(params: Record<string, string | undefined>, page: number) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value)
  }
  if (page > 1) qs.set('page', String(page))
  return `/articles${qs.toString() ? `?${qs}` : ''}`
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { category?: string; tag?: string; q?: string; page?: string }
}) {
  const { category, tag, q } = searchParams
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let rows: (typeof articles.$inferSelect)[] = []
  let total = 0
  let categoryCounts: Record<string, number> = {}

  try {
    const conditions = [eq(articles.status, 'published')]
    if (category) conditions.push(eq(articles.category, category))
    if (tag) conditions.push(sql`${tag} = any(${articles.tags})`)
    if (q) {
      const term = `%${q}%`
      conditions.push(or(ilike(articles.title, term), ilike(articles.excerpt, term))!)
    }
    const where = and(...conditions)

    const [totalRow] = await db.select({ value: count() }).from(articles).where(where)
    total = Number(totalRow?.value ?? 0)

    rows = await db.select().from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(PAGE_SIZE)
      .offset(offset)

    const categoryRows = await db.select({ category: articles.category, value: count() })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .groupBy(articles.category)
    categoryCounts = Object.fromEntries(categoryRows.filter(r => r.category).map(r => [r.category!, Number(r.value)]))
  } catch { /* DB not connected */ }

  const activeCategory = category ?? ''
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">

        {/* Header */}
        <div className="mb-10">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-2">บทความทั้งหมด</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            ธุรกิจ กลยุทธ์ และการเติบโต
          </h1>
          <p className="text-muted text-sm max-w-xl">
            ความรู้ธุรกิจเชิงลึกสำหรับผู้ประกอบการและนักธุรกิจไทย อ่านจบแล้วนำไปใช้ได้จริง
          </p>
        </div>

        <ArticleSearchBox q={q} category={activeCategory} tag={tag} />

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/articles"
            className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all ${
              !activeCategory
                ? 'bg-purple text-white border-purple'
                : 'border-purple/25 text-muted hover:border-purple/50 hover:text-white'
            }`}
          >
            ทั้งหมด ({Object.values(categoryCounts).reduce((sum, n) => sum + n, 0)})
          </Link>
          {CATEGORIES.map(c => {
            const catCount = categoryCounts[c.name] ?? 0
            if (catCount === 0) return null
            return (
              <Link
                key={c.name}
                href={activeCategory === c.name ? '/articles' : pageHref({ category: c.name, tag, q }, 1)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all ${
                  activeCategory === c.name
                    ? 'bg-purple text-white border-purple'
                    : 'border-purple/25 text-muted hover:border-purple/50 hover:text-white'
                }`}
              >
                {c.icon} {c.name} ({catCount})
              </Link>
            )
          })}
        </div>

        {/* Active filter label */}
        {(tag || q) && (
          <div className="flex items-center gap-3 mb-6 font-mono text-xs text-muted">
            {tag && <span>แท็ก: <span className="text-accent">#{tag}</span></span>}
            {q && <span>ค้นหา: <span className="text-accent">&quot;{q}&quot;</span></span>}
            <Link href="/articles" className="text-red-400 hover:underline">✕ ล้างตัวกรอง</Link>
          </div>
        )}

        {/* Article grid */}
        {rows.length === 0 ? (
          <div className="py-24 text-center border border-purple/10 rounded-2xl" style={{ background: 'rgba(45,27,94,.15)' }}>
            <div className="text-4xl mb-3">📭</div>
            <p className="text-white font-semibold mb-1">ยังไม่มีบทความ</p>
            <p className="text-muted text-sm">
              {activeCategory || tag || q ? 'ลองเปลี่ยนตัวกรอง' : 'กำลังเตรียมเนื้อหา'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 font-mono text-xs" style={{ color: 'rgba(155,142,196,.55)' }}>
              แสดง {rows.length} จาก {total} บทความ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10 font-mono text-xs">
                {page > 1 && (
                  <Link href={pageHref({ category, tag, q }, page - 1)} className="px-4 py-2 rounded-lg border border-purple/25 text-accent hover:border-accent/50">
                    ← ก่อนหน้า
                  </Link>
                )}
                <span style={{ color: '#9B8EC4' }}>หน้า {page} / {totalPages}</span>
                {page < totalPages && (
                  <Link href={pageHref({ category, tag, q }, page + 1)} className="px-4 py-2 rounded-lg border border-purple/25 text-accent hover:border-accent/50">
                    ถัดไป →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
