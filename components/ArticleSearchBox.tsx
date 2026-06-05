'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Suggestion = {
  title: string
  slug: string
  excerpt: string | null
  category: string | null
}

type SuggestData = {
  articles: Suggestion[]
  tags: string[]
  categories: string[]
}

export function ArticleSearchBox({ q, category, tag }: { q?: string; category?: string; tag?: string }) {
  const [value, setValue] = useState(q ?? '')
  const [data, setData] = useState<SuggestData>({ articles: [], tags: [], categories: [] })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) {
      setData({ articles: [], tags: [], categories: [] })
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      if (res.ok) {
        const json = await res.json()
        setData({ articles: json.articles ?? [], tags: json.tags ?? [], categories: json.categories ?? [] })
        setOpen(true)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [value])

  const hasSuggestions = useMemo(() => data.articles.length + data.tags.length + data.categories.length > 0, [data])

  return (
    <div className="relative mb-6 max-w-xl">
      <form action="/articles" className="flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          type="search"
          name="q"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาบทความ..."
          className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm outline-none border text-white"
          style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(167,139,250,.25)' }}
        />
        <button className="bg-purple text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">ค้นหา</button>
      </form>

      {open && value.trim().length >= 2 && hasSuggestions && (
        <div className="absolute z-20 left-0 right-0 mt-2 rounded-xl border overflow-hidden shadow-2xl" style={{ borderColor: 'rgba(124,58,237,.25)', background: '#120F1E' }}>
          {data.articles.length > 0 && (
            <div className="p-2">
              <div className="font-mono text-[10px] text-purple uppercase tracking-widest px-2 py-1">Articles</div>
              {data.articles.map(item => (
                <Link key={item.slug} href={`/articles/${item.slug}`} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-purple/10">
                  <div className="text-sm font-semibold text-white line-clamp-1">{item.title}</div>
                  <div className="text-[11px] mt-0.5 line-clamp-1" style={{ color: '#9B8EC4' }}>{item.category ?? 'Article'} · {item.excerpt}</div>
                </Link>
              ))}
            </div>
          )}

          {(data.tags.length > 0 || data.categories.length > 0) && (
            <div className="border-t p-3 flex flex-wrap gap-2" style={{ borderColor: 'rgba(124,58,237,.12)' }}>
              {data.categories.map(item => (
                <Link key={item} href={`/articles?category=${encodeURIComponent(item)}`} onClick={() => setOpen(false)} className="font-mono text-[10px] px-2 py-1 rounded-full border text-accent" style={{ borderColor: 'rgba(124,58,237,.25)' }}>
                  {item}
                </Link>
              ))}
              {data.tags.map(item => (
                <Link key={item} href={`/tags/${encodeURIComponent(item)}`} onClick={() => setOpen(false)} className="font-mono text-[10px] px-2 py-1 rounded-full border" style={{ borderColor: 'rgba(124,58,237,.25)', color: '#9B8EC4' }}>
                  #{item}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
