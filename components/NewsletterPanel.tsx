'use client'

import { useEffect, useState } from 'react'

type Config = { enabled: boolean; lookbackDays: number; maxArticles: number }
type Preview = { title: string; slug: string }

export function NewsletterPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [preview, setPreview] = useState<Preview[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/newsletter')
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setPreview(data.preview ?? []) }
  }

  async function save(next: Config) {
    setConfig(next)
    const res = await fetch('/api/newsletter', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: next }) })
    const data = await res.json()
    if (res.ok) { setConfig(data.config); setMessage('saved') } else setMessage(data.error ?? 'save failed')
  }

  async function sendNow() {
    if (!confirm('Send the newsletter to all active subscribers now?')) return
    setSending(true); setMessage('sending…')
    const res = await fetch('/api/newsletter', { method: 'POST' })
    const data = await res.json()
    setSending(false)
    setMessage(res.ok
      ? (data.skipped ? `skipped: ${data.reason}` : `sent ${data.sent} · failed ${data.failed} · ${data.recipients} recipients`)
      : (data.error ?? 'send failed'))
  }

  if (!config) return null
  const num = (k: keyof Config) => config[k] as number

  return (
    <section className="rounded-xl border p-5 mb-6" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        <h2 className="font-heading text-lg font-bold text-white">Newsletter
          <span className="ml-3 font-mono text-xs" style={{ color: '#9B8EC4' }}>{preview.length} article(s) in next send</span>
        </h2>
        <div className="flex items-center gap-3">
          {message && <span className="font-mono text-xs text-accent">{message}</span>}
          <button type="button" onClick={sendNow} disabled={sending} className="px-3 py-1.5 rounded-lg border font-mono text-xs disabled:opacity-50" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.35)' }}>send now</button>
          <label className="flex items-center gap-1.5 font-mono text-xs cursor-pointer" style={{ color: '#C4B5FD' }}>
            <input type="checkbox" checked={config.enabled} onChange={e => save({ ...config, enabled: e.target.checked })} />
            {config.enabled ? 'weekly on' : 'weekly off'}
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([['lookbackDays', 'lookback (days)'], ['maxArticles', 'max articles']] as const).map(([key, label]) => (
          <label key={key} className="font-mono text-xs" style={{ color: '#9B8EC4' }}>
            {label}
            <input type="number" value={num(key)} onChange={e => setConfig({ ...config, [key]: Number(e.target.value) })} onBlur={() => save(config)}
              className="mt-1 w-full px-2 py-1.5 rounded border bg-transparent text-white outline-none" style={{ borderColor: 'rgba(124,58,237,.25)' }} />
          </label>
        ))}
      </div>
      <p className="font-mono text-[10px] mt-3" style={{ color: 'rgba(155,142,196,.6)' }}>Weekly cron emails active subscribers the latest published articles (Resend). Each email includes an unsubscribe link.</p>
    </section>
  )
}
