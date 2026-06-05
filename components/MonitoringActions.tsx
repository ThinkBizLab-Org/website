'use client'
import { useState } from 'react'

export function MonitoringActions() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const sendTest = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/monitoring/test', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Test failed')
      setMsg('Test event sent')
      window.location.reload()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={sendTest} disabled={loading} className="bg-purple text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {loading ? 'Sending...' : 'Send test event'}
      </button>
      {msg && <span className="font-mono text-xs" style={{ color: msg.startsWith('Error') ? '#F87171' : '#10B981' }}>{msg}</span>}
    </div>
  )
}
