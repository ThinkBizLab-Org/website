'use client'
import { useState } from 'react'

export function LinkCheckerActions() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const runScan = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/link-checker', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')
      setMsg(`Scan complete: ${data.total ?? 0} links, ${data.broken ?? 0} broken, ${data.warnings ?? 0} warnings`)
      window.location.reload()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={runScan}
        disabled={loading}
        className="bg-purple text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Scanning...' : 'Run link scan'}
      </button>
      {msg && (
        <span className="font-mono text-xs" style={{ color: msg.startsWith('Error') ? '#F87171' : '#10B981' }}>{msg}</span>
      )}
    </div>
  )
}
