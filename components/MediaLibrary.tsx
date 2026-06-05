'use client'

import { useEffect, useMemo, useState } from 'react'

type MediaObject = {
  key: string
  url: string
  size: number
  lastModified: string | null
  usedByCount?: number
  usedBy?: { id: string; title: string; slug: string }[]
}

const PREFIXES = [
  ['', 'ทั้งหมด'],
  ['articles/covers', 'Article covers'],
  ['articles/content-images', 'Content images'],
  ['generated/covers', 'Generated covers'],
  ['generated/instagram', 'Generated IG'],
  ['social/videos', 'Social videos'],
  ['uploads/misc', 'Misc'],
] as const

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function MediaLibrary() {
  const [prefix, setPrefix] = useState('')
  const [objects, setObjects] = useState<MediaObject[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orphanOnly, setOrphanOnly] = useState(false)

  const query = useMemo(() => {
    const qs = new URLSearchParams({ limit: '60' })
    if (prefix) qs.set('prefix', prefix)
    return qs.toString()
  }, [prefix])

  async function load(nextCursor?: string | null) {
    setLoading(true)
    setError('')
    const qs = new URLSearchParams(query)
    if (nextCursor) qs.set('cursor', nextCursor)

    try {
      const res = await fetch(`/api/media?${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load media')
      setObjects(prev => nextCursor ? [...prev, ...data.objects] : data.objects)
      setCursor(data.nextCursor ?? null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function remove(key: string) {
    const ok = window.confirm(`Delete this R2 object?\n\n${key}`)
    if (!ok) return

    const res = await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (res.ok) setObjects(prev => prev.filter(item => item.key !== key))
  }

  useEffect(() => {
    setObjects([])
    setCursor(null)
    load(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const visibleObjects = orphanOnly ? objects.filter(item => (item.usedByCount ?? 0) === 0) : objects

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {PREFIXES.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setPrefix(value)}
              className="px-3 py-2 rounded-lg border text-sm transition-colors"
              style={{
                borderColor: prefix === value ? '#A78BFA' : 'rgba(124,58,237,.2)',
                color: prefix === value ? '#fff' : '#9B8EC4',
                background: prefix === value ? 'rgba(124,58,237,.35)' : 'rgba(15,13,26,.5)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer" style={{ borderColor: 'rgba(124,58,237,.2)', color: '#9B8EC4', background: 'rgba(15,13,26,.5)' }}>
          <input type="checkbox" checked={orphanOnly} onChange={e => setOrphanOnly(e.target.checked)} />
          Orphan only
        </label>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Preview</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Key</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Usage</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Size</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Updated</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {visibleObjects.map(item => {
              const isImage = /\.(png|jpe?g|webp|gif)$/i.test(item.key)
              const usedBy = item.usedBy ?? []
              return (
                <tr key={item.key}>
                  <td className="px-4 py-3">
                    {isImage ? (
                      <img src={item.url} alt="" className="h-12 w-16 rounded object-cover bg-black/40" />
                    ) : (
                      <div className="h-12 w-16 rounded bg-purple/10 flex items-center justify-center font-mono text-[10px]" style={{ color: '#9B8EC4' }}>FILE</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a href={item.url} target="_blank" rel="noopener" className="font-mono text-xs text-accent hover:underline break-all">{item.key}</a>
                  </td>
                  <td className="px-4 py-3">
                    {usedBy.length > 0 ? (
                      <div className="space-y-1">
                        <div className="font-mono text-[10px]" style={{ color: '#10B981' }}>{usedBy.length} article{usedBy.length > 1 ? 's' : ''}</div>
                        {usedBy.slice(0, 2).map(article => (
                          <a key={article.id} href={`/admin/articles/${article.id}`} className="block max-w-[180px] truncate text-[11px] text-white hover:text-accent">
                            {article.title}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-red-300">orphan</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{formatSize(item.size)}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.lastModified ? new Date(item.lastModified).toLocaleString('th-TH') : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => navigator.clipboard.writeText(item.url)} className="font-mono text-xs text-accent hover:underline mr-4">copy</button>
                    <button type="button" onClick={() => remove(item.key)} className="font-mono text-xs text-red-300 hover:underline">delete</button>
                  </td>
                </tr>
              )
            })}
            {!loading && visibleObjects.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ไม่พบไฟล์ในเงื่อนไขนี้</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="font-mono text-xs" style={{ color: '#9B8EC4' }}>{visibleObjects.length} / {objects.length} objects</div>
        {cursor && (
          <button type="button" disabled={loading} onClick={() => load(cursor)} className="bg-purple text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
