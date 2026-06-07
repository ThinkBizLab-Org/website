'use client'
import { useState, useCallback } from 'react'

export interface GeneratedOption {
  angle: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  aiSummaryQ: string
  aiSummaryA: string
  keyPoints: string[]
  faq: { q: string; a: string }[]
  readTime: number
  lineBroadcastMsg: string
  fbCaption: string
  fbHashtags: string
  ttCaption: string
  ttHashtags: string
  igCaption: string
  igHashtags: string
  coverImagePrompt: string
  ttVdoPrompt: string
  igImagePrompt: string
  videoPlan?: unknown
}

interface Props {
  title: string
  category: string
  tags: string
  onSelect: (option: GeneratedOption) => void
  onClose: () => void
}

export function GenerateModal({ title, category, tags, onSelect, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [option, setOption] = useState<GeneratedOption | null>(null)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [dots, setDots] = useState('.')

  const generate = useCallback(() => {
    setLoading(true)
    setError('')
    setOption(null)

    const interval = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)

    fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, tags }),
    })
      .then(r => r.json())
      .then(data => {
        clearInterval(interval)
        if (data.error) { setError(data.error); setLoading(false); return }
        setOption(data.options?.[0] ?? null)
        setLoading(false)
      })
      .catch(e => {
        clearInterval(interval)
        setError(String(e))
        setLoading(false)
      })

    return () => clearInterval(interval)
  }, [title, category, tags])

  useState(() => { return generate() })

  const handleApply = () => {
    if (!option) return
    setApplying(true)
    setTimeout(() => {
      onSelect(option)
      onClose()
    }, 350)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border"
        style={{ borderColor: 'rgba(124,58,237,.3)', background: '#0F0D1A' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(124,58,237,.15)', background: 'rgba(15,13,26,.95)', backdropFilter: 'blur(12px)' }}>
          <div>
            <div className="font-mono text-xs text-purple uppercase tracking-widest mb-0.5">Claude AI</div>
            <h2 className="font-heading text-lg font-bold text-white">สร้างเนื้อหาด้วย AI</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white">✕</button>
        </div>

        <div className="p-6">
          {/* Topic preview */}
          <div className="mb-6 px-4 py-3 rounded-lg font-mono text-sm" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)', color: '#A78BFA' }}>
            📝 หัวข้อ: <span className="text-white">{title}</span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-16 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-purple/30 border-t-purple animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
              </div>
              <div className="text-center">
                <div className="font-heading text-lg text-white mb-2">Claude กำลังสร้างเนื้อหา{dots}</div>
                <div className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.6)' }}>
                  กำลังสร้างบทความพร้อม GEO optimization · ใช้เวลา 15-30 วินาที
                </div>
              </div>
              <div className="flex gap-3">
                {['วิเคราะห์หัวข้อ', 'สร้างเนื้อหา GEO', 'เตรียม Social Media'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2 font-mono text-[10px] px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(124,58,237,.12)', color: '#9B8EC4' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                    {step}
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="font-mono text-xs px-4 py-2 rounded-lg border transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(124,58,237,.25)', color: 'rgba(155,142,196,.6)' }}>
                ยกเลิก
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="py-12 flex flex-col items-center gap-5">
              <div className="text-4xl">⚠️</div>
              <div className="text-center">
                <div className="font-heading text-base text-white mb-2">เกิดข้อผิดพลาด</div>
                <div className="font-mono text-xs px-4 py-2 rounded-lg max-w-md" style={{ color: '#F87171', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                  {error}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={generate} className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                  🔄 ลองอีกครั้ง
                </button>
                <button onClick={onClose} className="px-5 py-2.5 rounded-lg font-mono text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'rgba(124,58,237,.25)', color: '#9B8EC4' }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {!loading && !error && option && (
            <div className="space-y-4">
              {/* Preview card */}
              <div className="rounded-xl border p-5 space-y-4"
                style={{ borderColor: 'rgba(124,58,237,.35)', background: 'rgba(124,58,237,.07)' }}>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(124,58,237,.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,.3)' }}>
                    {option.category}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>
                    {option.readTime} นาที
                  </span>
                  <div className="flex gap-1.5 ml-auto">
                    {['LINE', 'FB', 'IG', 'TikTok', 'GEO'].map(p => (
                      <span key={p} className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: p === 'GEO' ? 'rgba(16,185,129,.12)' : 'rgba(124,58,237,.12)', color: p === 'GEO' ? '#10B981' : '#A78BFA' }}>
                        ✓ {p}
                      </span>
                    ))}
                  </div>
                </div>

                <h3 className="font-heading text-base font-bold text-white leading-snug">{option.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9B8EC4' }}>{option.excerpt}</p>

                {/* Key points */}
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'rgba(155,142,196,.5)' }}>Key Points</div>
                  <ul className="space-y-1.5">
                    {option.keyPoints.map((pt, i) => (
                      <li key={i} className="flex gap-2 text-sm" style={{ color: '#9B8EC4' }}>
                        <span style={{ color: '#A78BFA' }}>▸</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {option.tags.map(t => (
                    <span key={t} className="font-mono text-[10px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(124,58,237,.12)', color: '#9B8EC4' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: applying ? '#10B981' : 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
                  {applying ? '✓ กำลังใส่เนื้อหา...' : '✨ ใช้เนื้อหานี้ →'}
                </button>
                <button
                  onClick={generate}
                  className="px-4 py-3 rounded-xl font-mono text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'rgba(124,58,237,.25)', color: '#9B8EC4' }}>
                  🔄 สร้างใหม่
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl font-mono text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'rgba(124,58,237,.15)', color: 'rgba(155,142,196,.5)' }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
