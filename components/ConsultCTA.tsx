'use client'

import { useState } from 'react'

// Conversion form: turns a reader into a business lead. Compact mode renders a
// condensed in-article card; full mode is for the /contact page.
export function ConsultCTA({
  source = 'consult',
  interest = '',
  articleId,
  compact = false,
}: {
  source?: string
  interest?: string
  articleId?: string
  compact?: boolean
}) {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, interest, source, ...(articleId ? { articleId } : {}) }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'ส่งไม่สำเร็จ')
      setDone(true)
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ''))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { background: 'rgba(15,13,26,.7)', borderColor: 'rgba(124,58,237,.25)', color: '#fff' }

  return (
    <section className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'rgba(124,58,237,.3)', background: 'linear-gradient(160deg, rgba(45,27,94,.5), rgba(30,16,48,.55))' }}>
      <div className="font-mono text-xs font-bold text-purple uppercase tracking-widest mb-2">{'// ปรึกษาธุรกิจกับเรา'}</div>
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mb-2">อยากให้ธุรกิจโตแบบมีระบบ?</h2>
      <p className="text-sm mb-5" style={{ color: '#C4B5FD' }}>ทิ้งข้อมูลไว้ ทีมงานจะติดต่อกลับเพื่อพูดคุยแนวทางที่เหมาะกับคุณ</p>

      {done ? (
        <p className="font-mono text-sm" style={{ color: '#10B981' }}>✓ รับข้อมูลแล้ว เราจะติดต่อกลับโดยเร็วที่สุด</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className={compact ? 'space-y-3' : 'grid sm:grid-cols-2 gap-3'}>
            <input type="text" value={form.name} onChange={set('name')} placeholder="ชื่อ" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} />
            <input type="email" required value={form.email} onChange={set('email')} placeholder="อีเมล *" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} />
          </div>
          {!compact && (
            <input type="text" value={form.company} onChange={set('company')} placeholder="บริษัท / ธุรกิจ" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} />
          )}
          <textarea value={form.message} onChange={set('message')} placeholder="เล่าสั้นๆ ว่าอยากให้เราช่วยเรื่องอะไร" rows={compact ? 2 : 3} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none" style={inputStyle} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading || !form.email.trim()} className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff' }}>
              {loading ? 'กำลังส่ง...' : 'ส่งข้อมูลให้ติดต่อกลับ'}
            </button>
            {error && <span className="font-mono text-xs" style={{ color: '#F87171' }}>{error}</span>}
          </div>
        </form>
      )}
    </section>
  )
}
