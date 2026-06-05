import Link from 'next/link'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { ArticleCard } from '@/components/ArticleCard'

export async function PublicArticleListing({
  title,
  description,
  category,
  tag,
}: {
  title: string
  description: string
  category?: string
  tag?: string
}) {
  let rows: (typeof articles.$inferSelect)[] = []

  try {
    const conditions = [eq(articles.status, 'published')]
    if (category) conditions.push(eq(articles.category, category))
    if (tag) conditions.push(sql`${tag} = any(${articles.tags})`)

    rows = await db.select().from(articles)
      .where(sql.join(conditions, sql` and `))
      .orderBy(desc(articles.publishedAt))
      .limit(24)
  } catch {
    rows = []
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
      <div className="mb-10">
        <Link href="/articles" className="font-mono text-xs text-accent hover:underline">← บทความทั้งหมด</Link>
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight mt-4 mb-3">{title}</h1>
        <p className="text-muted text-sm max-w-2xl">{description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="py-24 text-center border border-purple/10 rounded-2xl" style={{ background: 'rgba(45,27,94,.15)' }}>
          <p className="text-white font-semibold mb-1">ยังไม่มีบทความในหน้านี้</p>
          <p className="text-muted text-sm">กำลังเตรียมเนื้อหาเพิ่มเติม</p>
        </div>
      ) : (
        <>
          <div className="mb-4 font-mono text-xs" style={{ color: 'rgba(155,142,196,.55)' }}>{rows.length} บทความ</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map(article => <ArticleCard key={article.id} article={article} />)}
          </div>
        </>
      )}
    </main>
  )
}
