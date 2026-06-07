'use client'
import { useState } from 'react'

type R2Object = { key: string; url: string; size: number; lastModified: string | null }

// Lets the editor pick a video that's already on R2 (uploaded earlier or written
// by the video pipeline) instead of re-uploading. Selecting one fills the URL.
export function R2VideoPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<R2Object[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setOpen(true); setLoading(true); setError('')
    try {
      const res = await fetch('/api/media?prefix=social/videos&limit=50')
      const data = await res.json()
      if (!res.ok || !data.ok) { setError(data.error ?? 'โหลดรายการไม่ได้'); return }
      const vids = ((data.objects ?? []) as R2Object[])
        .filter(o => /\.(mp4|mov|webm|m4v)$/i.test(o.key))
        .sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''))
      setItems(vids)
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={load}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm border transition-all hover:bg-purple/10"
        style={{ borderColor: 'rgba(124,58,237,.35)', color: '#A78BFA', background: 'rgba(124,58,237,.08)' }}>
        📂 เลือกไฟล์จาก R2
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg border p-2 max-h-64 overflow-y-auto" style={{ borderColor: 'rgba(124,58,237,.25)', background: 'rgba(0,0,0,.25)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.7)' }}>วิดีโอบน R2 (เลือกเพื่อใช้)</span>
        <button type="button" onClick={() => setOpen(false)} className="font-mono text-[10px] text-purple hover:underline">ปิด</button>
      </div>
      {loading && <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.6)' }}>กำลังโหลด…</p>}
      {error && <p className="font-mono text-[10px]" style={{ color: '#F87171' }}>⚠ {error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มีวิดีโอบน R2 — อัปโหลดก่อน</p>
      )}
      <div className="space-y-1">
        {items.map(o => (
          <button key={o.key} type="button" onClick={() => { onSelect(o.url); setOpen(false) }}
            className="w-full text-left px-2 py-1.5 rounded font-mono text-[10px] hover:bg-white/5 flex items-center justify-between gap-2"
            style={{ color: '#E2D9F3' }}>
            <span className="truncate">🎬 {o.key.split('/').pop()}</span>
            <span className="flex-shrink-0" style={{ color: 'rgba(155,142,196,.5)' }}>{(o.size / 1024 / 1024).toFixed(1)}MB</span>
          </button>
        ))}
      </div>
    </div>
  )
}
