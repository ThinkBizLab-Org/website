'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { geoScoreLabel } from '@/lib/geo-score'

const PAGE_SIZE = 20

type Article = {
  id: string
  title: string | null
  slug: string | null
  category: string | null
  status: string | null
  geoScore: number | null
  lineBroadcastSent: boolean | null
  lineBroadcastMsg: string | null
  updatedAt: Date | null
}

const STATUSES = ['ทั้งหมด', 'published', 'approved', 'review', 'draft'] as const

export function AdminArticleList({ articles }: { articles: Article[] }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('ทั้งหมด')
  const [category, setCategory] = useState<string>('ทั้งหมด')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  const categories = useMemo(() => {
    const cats = Array.from(new Set(articles.map(a => a.category).filter(Boolean))) as string[]
    return ['ทั้งหมด', ...cats.sort()]
  }, [articles])

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (status !== 'ทั้งหมด' && a.status !== status) return false
      if (category !== 'ทั้งหมด' && a.category !== category) return false
      if (q.trim()) {
        const s = q.toLowerCase()
        return (a.title ?? '').toLowerCase().includes(s) || (a.slug ?? '').toLowerCase().includes(s)
      }
      return true
    })
  }, [articles, q, status, category])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [q, status, category])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const selectedVisible = paginated.length > 0 && paginated.every(a => selectedSet.has(a.id))

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    published: { label: 'เผยแพร่', color: '#10B981', bg: 'rgba(16,185,129,.12)' },
    approved:  { label: 'Approved', color: '#38BDF8', bg: 'rgba(56,189,248,.12)' },
    review:    { label: 'Review',  color: '#F97316', bg: 'rgba(249,115,22,.12)' },
    draft:     { label: 'Draft',   color: '#9B8EC4', bg: 'rgba(155,142,196,.12)' },
  }

  const toggleSelected = (id: string) => {
    setSelected(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  }

  const toggleVisible = () => {
    const visibleIds = paginated.map(a => a.id)
    setSelected(ids => selectedVisible
      ? ids.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...ids, ...visibleIds]))
    )
  }

  const bulkAction = async (action: 'delete' | 'set-status', nextStatus?: string) => {
    if (selected.length === 0) return
    if (action === 'delete' && !confirm(`ต้องการลบ ${selected.length} บทความ?`)) return
    setBulkLoading(true)
    setBulkMsg('')
    try {
      const res = await fetch('/api/articles/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selected, status: nextStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Bulk action failed')
      }
      window.location.reload()
    } catch (e) {
      setBulkMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
    } finally {
      setBulkLoading(false)
    }
  }

  const duplicateArticle = async (id: string) => {
    setBulkLoading(true)
    setBulkMsg('')
    try {
      const res = await fetch(`/api/articles/${id}/duplicate`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Duplicate failed')
      window.location.href = `/admin/articles/${data.id}`
    } catch (e) {
      setBulkMsg(`เกิดข้อผิดพลาด: ${String(e)}`)
      setBulkLoading(false)
    }
  }

  return (
    <div>
      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(155,142,196,.5)' }}>🔍</span>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ค้นหาชื่อบทความ..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-white text-sm outline-none"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }}
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>✕</button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(124,58,237,.25)' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className="px-3 py-2 font-mono text-xs transition-colors"
              style={{ background: status === s ? 'rgba(124,58,237,.4)' : 'transparent', color: status === s ? '#fff' : 'rgba(155,142,196,.6)' }}>
              {s === 'published' ? 'เผยแพร่' : s === 'approved' ? 'Approved' : s === 'review' ? 'Review' : s === 'draft' ? 'Draft' : s}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#A78BFA', colorScheme: 'dark' }}
          >
            <option value="ทั้งหมด">ทุกหมวดหมู่</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Count */}
      <div className="font-mono text-xs mb-3" style={{ color: 'rgba(155,142,196,.5)' }}>
        {filtered.length === articles.length ? `${articles.length} บทความ` : `${filtered.length} / ${articles.length} บทความ`}
        {totalPages > 1 && <span className="ml-2">— หน้า {page}/{totalPages}</span>}
      </div>

      {(selected.length > 0 || bulkMsg) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(45,27,94,.18)' }}>
          <span className="font-mono text-xs mr-1" style={{ color: '#A78BFA' }}>{selected.length} selected</span>
          <button disabled={bulkLoading} onClick={() => bulkAction('set-status', 'draft')} className="px-3 py-1.5 rounded font-mono text-[10px] border disabled:opacity-50" style={{ borderColor: 'rgba(155,142,196,.25)', color: '#C4B5FD' }}>Draft</button>
          <button disabled={bulkLoading} onClick={() => bulkAction('set-status', 'review')} className="px-3 py-1.5 rounded font-mono text-[10px] border disabled:opacity-50" style={{ borderColor: 'rgba(249,115,22,.3)', color: '#F97316' }}>Review</button>
          <button disabled={bulkLoading} onClick={() => bulkAction('set-status', 'approved')} className="px-3 py-1.5 rounded font-mono text-[10px] border disabled:opacity-50" style={{ borderColor: 'rgba(56,189,248,.3)', color: '#38BDF8' }}>Approved</button>
          <button disabled={bulkLoading} onClick={() => bulkAction('set-status', 'published')} className="px-3 py-1.5 rounded font-mono text-[10px] border disabled:opacity-50" style={{ borderColor: 'rgba(16,185,129,.3)', color: '#10B981' }}>Published</button>
          <button disabled={bulkLoading} onClick={() => bulkAction('delete')} className="px-3 py-1.5 rounded font-mono text-[10px] border disabled:opacity-50" style={{ borderColor: 'rgba(248,113,113,.35)', color: '#F87171' }}>Delete</button>
          {bulkMsg && <span className="font-mono text-[10px]" style={{ color: '#F87171' }}>{bulkMsg}</span>}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border py-16 text-center" style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(45,27,94,.1)' }}>
          <div className="font-mono text-sm" style={{ color: 'rgba(155,142,196,.4)' }}>ไม่พบบทความที่ตรงกับเงื่อนไข</div>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(45,27,94,.3)' }}>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedVisible} onChange={toggleVisible} className="accent-purple" aria-label="Select visible articles" />
                </th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple uppercase tracking-widest">ชื่อบทความ</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple uppercase tracking-widest hidden sm:table-cell">หมวดหมู่</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple uppercase tracking-widest hidden md:table-cell">GEO</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple uppercase tracking-widest">Status</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple uppercase tracking-widest hidden lg:table-cell">LINE</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {paginated.map(a => {
                const geo = geoScoreLabel(a.geoScore ?? 0)
                const s = statusMeta[a.status ?? 'draft'] ?? statusMeta.draft
                return (
                  <tr key={a.id} className="transition-colors hover:bg-purple/5">
                    <td className="px-4 py-3 align-top">
                      <input type="checkbox" checked={selectedSet.has(a.id)} onChange={() => toggleSelected(a.id)} className="accent-purple" aria-label={`Select ${a.title ?? a.slug ?? 'article'}`} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/articles/${a.id}`} className="block group">
                        <div className="font-semibold text-white line-clamp-1 max-w-xs group-hover:text-purple transition-colors">{a.title}</div>
                        <div className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(155,142,196,.5)' }}>{a.slug}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {a.category && <span className="font-mono text-[10px] text-purple uppercase tracking-wider">{a.category}</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${a.geoScore ?? 0}%`, background: geo.color }} />
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: geo.color }}>{a.geoScore ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] font-bold px-2 py-1 rounded" style={{ color: s.color, background: s.bg }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {a.lineBroadcastSent
                        ? <span className="font-mono text-[10px]" style={{ color: '#10B981' }}>✓ ส่งแล้ว</span>
                        : a.lineBroadcastMsg
                          ? <span className="font-mono text-[10px]" style={{ color: '#F59E0B' }}>⏳ รอส่ง</span>
                          : <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.35)' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/articles/${a.id}`} className="font-mono text-xs text-accent hover:underline whitespace-nowrap">แก้ไข →</Link>
                        <button type="button" onClick={() => duplicateArticle(a.id)} disabled={bulkLoading} className="font-mono text-xs hover:underline whitespace-nowrap disabled:opacity-50" style={{ color: '#38BDF8' }}>Duplicate</button>
                        {a.slug && (
                          <Link href={`/articles/${a.slug}`} target="_blank" className="font-mono text-xs hover:underline whitespace-nowrap" style={{ color: 'rgba(155,142,196,.5)' }}>ดู ↗</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg font-mono text-xs flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30"
            style={{ color: '#A78BFA' }}
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg font-mono text-xs flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30"
            style={{ color: '#A78BFA' }}
          >‹</button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '…')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.4)' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className="w-8 h-8 rounded-lg font-mono text-xs flex items-center justify-center transition-colors"
                  style={{
                    background: page === p ? 'rgba(124,58,237,.4)' : 'transparent',
                    color: page === p ? '#fff' : 'rgba(155,142,196,.6)',
                  }}
                >{p}</button>
              )
            )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg font-mono text-xs flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30"
            style={{ color: '#A78BFA' }}
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg font-mono text-xs flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30"
            style={{ color: '#A78BFA' }}
          >»</button>
        </div>
      )}
    </div>
  )
}
