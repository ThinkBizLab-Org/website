'use client'
import { useState } from 'react'

export function BackupActions() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const runBackup = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/cron/backup', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.job?.error ?? data.error ?? 'Backup failed')
      setMsg('Backup complete')
      window.location.reload()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={runBackup} disabled={loading} className="bg-purple text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {loading ? 'Backing up...' : 'Run backup'}
      </button>
      {msg && <span className="font-mono text-xs" style={{ color: msg.startsWith('Error') ? '#F87171' : '#10B981' }}>{msg}</span>}
    </div>
  )
}
