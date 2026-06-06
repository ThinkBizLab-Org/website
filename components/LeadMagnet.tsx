'use client'

import { useState } from 'react'

// Content upgrade: trade a high-value asset (PDF / template / checklist) for an
// email. Uses the same double opt-in subscribe flow (so the list stays clean),
// and reveals the download immediately on success for instant gratification.
export function LeadMagnet({
  title,
  description,
  magnetUrl,
  source = 'lead-magnet',
  segment = 'general',
  articleId,
}: {
  title: string
  description: string
  magnetUrl?: string
  source?: string
  segment?: string
  articleId?: string
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, magnet: title, source, segment, ...(articleId ? { articleId } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Subscribe failed')
      setDone(true)
      setEmail('')
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-2xl border p-6 sm:p-8"
      style={{ borderColor: 'rgba(245,158,11,.3)', background: 'linear-gradient(160deg, rgba(245,158,11,.08), rgba(30,16,48,.5))' }}
    >
      <div className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#F59E0B' }}>🎁 ดาวน์โหลดฟรี</div>
      <h3 className="font-heading text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm mb-5" style={{ color: '#C4B5FD' }}>{description}</p>

      {done ? (
        <div className="space-y-3">
          <p className="font-mono text-sm" style={{ color: '#10B981' }}>
            ✓ สำเร็จ! {magnetUrl ? 'ดาวน์โหลดได้เลยด้านล่าง' : 'เราส่งลิงก์ไปที่อีเมลของคุณแล้ว'}
          </p>
          {magnetUrl && (
            <a
              href={magnetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#F59E0B', color: '#1a1320' }}
            >
              ⬇ ดาวน์โหลดเลย
            </a>
          )}
          <p className="font-mono text-[11px]" style={{ color: 'rgba(155,142,196,.55)' }}>
            อย่าลืมยืนยันอีเมลเพื่อรับบทความใหม่ทุกสัปดาห์
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2 max-w-md">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="อีเมลของคุณ"
            required
            className="flex-1 text-white px-4 py-3 rounded-xl text-sm outline-none border transition-colors min-w-0"
            style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(245,158,11,.3)' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
            style={{ background: '#F59E0B', color: '#1a1320' }}
          >
            {loading ? '...' : 'รับเลย'}
          </button>
        </form>
      )}
      {error && <p className="font-mono text-xs mt-2" style={{ color: '#F87171' }}>{error}</p>}
    </section>
  )
}
