'use client'

import { useState } from 'react'

export type InternalLinkSuggestion = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  score: number
  matchedTerms: string[]
  url: string
}

type Props = {
  articleId?: string
  title: string
  content: string
  category: string
  tags: string
  onInsert: (html: string) => void
}

export function InternalLinkSuggestions({ articleId, title, content, category, tags, onInsert }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState<InternalLinkSuggestion[]>([])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/internal-links/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, title, content, category, tags }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error ?? 'Cannot load suggestions')
        return
      }
      setSuggestions(data.suggestions ?? [])
      setMessage((data.suggestions ?? []).length ? '' : 'No relevant published articles found')
    } catch {
      setMessage('Cannot load suggestions')
    } finally {
      setLoading(false)
    }
  }

  function insertSuggestion(item: InternalLinkSuggestion) {
    const html = `<p><strong>อ่านต่อ:</strong> <a href="${item.url}">${escapeHtml(item.title)}</a></p>`
    onInsert(html)
  }

  return (
    <section className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(30,16,48,.35)' }}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="font-heading text-base font-bold text-white">Auto Internal Linking</h3>
          <p className="font-mono text-[10px]" style={{ color: '#9B8EC4' }}>แนะนำบทความ published ที่เกี่ยวข้องและยังไม่ได้ link</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading || !title.trim()}
          className="px-3 py-1.5 rounded-lg border font-mono text-xs disabled:opacity-50"
          style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA' }}
        >
          {loading ? 'checking...' : 'suggest links'}
        </button>
      </div>

      {message && <div className="font-mono text-xs mb-3" style={{ color: message.startsWith('Cannot') ? '#F87171' : '#9B8EC4' }}>{message}</div>}

      <div className="space-y-2">
        {suggestions.map(item => (
          <div key={item.id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(124,58,237,.14)', background: 'rgba(15,13,26,.5)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                <div className="font-mono text-[10px] truncate" style={{ color: '#9B8EC4' }}>
                  {item.category ?? 'Uncategorized'} · score {Math.round(item.score)}
                  {item.matchedTerms.length ? ` · ${item.matchedTerms.join(', ')}` : ''}
                </div>
                {item.excerpt && <div className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(155,142,196,.75)' }}>{item.excerpt}</div>}
              </div>
              <button
                type="button"
                onClick={() => insertSuggestion(item)}
                className="shrink-0 px-2 py-1 rounded border font-mono text-[10px] text-accent hover:bg-purple/10"
                style={{ borderColor: 'rgba(124,58,237,.3)' }}
              >
                insert
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
