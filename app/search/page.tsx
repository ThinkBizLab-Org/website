import Link from 'next/link'
import type { Metadata } from 'next'
import { searchPublishedArticles } from '@/lib/article-search'
import { SearchBox } from '@/components/SearchBox'

export const dynamic = 'force-dynamic'

export function generateMetadata({ searchParams }: { searchParams: { q?: string } }): Metadata {
  const q = searchParams.q?.trim()
  return {
    title: q ? `ค้นหา: ${q}` : 'ค้นหาบทความ',
    robots: { index: false },
  }
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? ''
  let results: Awaited<ReturnType<typeof searchPublishedArticles>> = []
  if (q.length >= 2) {
    try {
      results = await searchPublishedArticles(q, 30)
    } catch {
      results = []
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-white mb-4">ค้นหาบทความ</h1>
      <SearchBox initial={q} autoFocus />

      {q.length >= 2 && (
        <p className="mt-6 mb-3 text-sm" style={{ color: '#9B8EC4' }}>
          {results.length > 0 ? `พบ ${results.length} บทความสำหรับ “${q}”` : `ไม่พบบทความสำหรับ “${q}”`}
        </p>
      )}

      <div className="space-y-3">
        {results.map(item => (
          <Link key={item.slug} href={`/articles/${item.slug}`} className="block rounded-xl border p-4 hover:border-accent transition-colors" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.4)' }}>
            <div className="flex items-center gap-2 mb-1">
              {item.category && <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ color: '#A78BFA', background: 'rgba(124,58,237,.12)' }}>{item.category}</span>}
            </div>
            <h2 className="font-heading text-lg font-bold text-white">{item.title}</h2>
            {item.excerpt && <p className="text-sm mt-1 line-clamp-2" style={{ color: '#9B8EC4' }}>{item.excerpt}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
