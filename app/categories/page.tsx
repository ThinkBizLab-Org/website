import type { Metadata } from 'next'
import Link from 'next/link'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { Navbar } from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'หมวดหมู่ธุรกิจ | ThinkBiz Lab',
  description: 'สำรวจหมวดหมู่บทความธุรกิจ Strategy, Finance, Marketing, Startup, SME, Investment, AI & Tech และ Global Case',
}

const icons: Record<string, string> = {
  Strategy: '📊',
  Finance: '💰',
  Marketing: '📣',
  Startup: '🚀',
  SME: '🏪',
  Investment: '📈',
  'AI & Tech': '🤖',
  'Global Case': '🌏',
}

export default async function CategoriesPage() {
  let rows: { category: string | null; count: number }[] = []

  try {
    const result = await db.select({ category: articles.category, value: count() })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .groupBy(articles.category)
      .orderBy(desc(count()))

    rows = result
      .filter(row => row.category)
      .map(row => ({ category: row.category, count: Number(row.value) }))
  } catch {
    // DB not connected.
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="mb-10">
          <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-2">หมวดหมู่</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            สำรวจความรู้ธุรกิจตามหัวข้อ
          </h1>
          <p className="text-muted text-sm max-w-xl">
            เลือกหมวดที่สนใจเพื่ออ่านบทความที่เผยแพร่แล้วทั้งหมดในหัวข้อนั้น
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="py-24 text-center border border-purple/10 rounded-2xl" style={{ background: 'rgba(45,27,94,.15)' }}>
            <div className="text-4xl mb-3">🏷️</div>
            <p className="text-white font-semibold mb-1">ยังไม่มีหมวดหมู่</p>
            <p className="text-muted text-sm">หมวดหมู่จะแสดงเมื่อมีบทความที่เผยแพร่แล้ว</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rows.map(row => (
              <Link
                key={row.category}
                href={`/articles?category=${encodeURIComponent(row.category!)}`}
                className="rounded-xl border p-5 transition-all hover:-translate-y-1 hover:border-accent/40"
                style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(45,27,94,.25)' }}
              >
                <div className="text-3xl mb-3">{icons[row.category!] ?? '🧪'}</div>
                <h2 className="font-heading text-lg font-bold text-white mb-1">{row.category}</h2>
                <p className="font-mono text-xs" style={{ color: '#9B8EC4' }}>{row.count} บทความ</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
