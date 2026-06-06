import { NextResponse } from 'next/server'
import { searchPublishedArticles } from '@/lib/article-search'

// Public site search. No auth — only returns published articles.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ ok: true, query: q, results: [] })
  try {
    const results = await searchPublishedArticles(q, 20)
    return NextResponse.json({ ok: true, query: q, results })
  } catch {
    return NextResponse.json({ ok: false, query: q, results: [] }, { status: 500 })
  }
}
