'use client'

import { useState } from 'react'

export function NewsletterForm({
  compact = false,
  source = 'newsletter',
  segment = 'general',
}: {
  compact?: boolean
  source?: string
  segment?: string
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setMessage('')
    setOk(false)
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, segment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Subscribe failed')
      setOk(true)
      setMessage(data.status === 'active' ? 'อีเมลนี้อยู่ในรายการแล้ว' : 'สมัครแล้ว กรุณายืนยันผ่านลิงก์ในอีเมล')
      setEmail('')
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'max-w-sm mx-auto' : 'max-w-md mx-auto'}>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={compact ? 'your@email.com' : 'อีเมลของคุณ — รับ Insight ฟรีทุกสัปดาห์'}
          className="flex-1 text-white px-4 py-3 rounded-xl text-sm outline-none border transition-colors min-w-0"
          style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(167,139,250,.25)' }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-purple text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
        >
          {loading ? '...' : compact ? 'สมัครเลย' : 'สมัคร'}
        </button>
      </div>
      {message && (
        <p className="font-mono text-xs mt-2" style={{ color: ok ? '#10B981' : '#F87171' }}>
          {message}
        </p>
      )}
    </form>
  )
}
