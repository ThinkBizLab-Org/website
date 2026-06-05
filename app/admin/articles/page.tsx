import Link from 'next/link'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import { AdminArticleList } from '@/components/AdminArticleList'

export const dynamic = 'force-dynamic'

export default async function AdminArticlesPage() {
  let rows: (typeof articles.$inferSelect)[] = []
  try {
    rows = await db.select().from(articles).orderBy(desc(articles.updatedAt))
  } catch { /* DB not connected */ }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">บทความทั้งหมด</h1>
        </div>
        <Link href="/admin/articles/new"
          className="inline-flex items-center gap-2 bg-purple text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          + เพิ่มบทความใหม่
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border py-20 text-center" style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(45,27,94,.15)' }}>
          <div className="text-4xl mb-3">📝</div>
          <p className="text-white font-semibold mb-2">ยังไม่มีบทความ</p>
          <p className="text-sm mb-5" style={{ color: '#9B8EC4' }}>เริ่มเขียนบทความแรกของคุณได้เลย</p>
          <Link href="/admin/articles/new" className="bg-purple text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            เพิ่มบทความแรก
          </Link>
        </div>
      ) : (
        <AdminArticleList articles={rows} />
      )}
    </div>
  )
}
