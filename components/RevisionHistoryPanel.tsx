'use client'

import { useEffect, useState } from 'react'

type Revision = {
  id: string
  version: number
  action: string
  actorEmail: string | null
  createdAt: string | null
}

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export function RevisionHistoryPanel({ articleId }: { articleId: string }) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/revisions`)
      const data = await res.json()
      if (res.ok) setRevisions(data.revisions ?? [])
      else setMessage(data.error ?? 'Cannot load revisions')
    } finally {
      setLoading(false)
    }
  }

  async function restore(revision: Revision) {
    const ok = window.confirm(`Restore article to version ${revision.version}?`)
    if (!ok) return
    setRestoring(revision.id)
    setMessage('')
    try {
      const res = await fetch(`/api/articles/${articleId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId: revision.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Restore failed')
      setMessage(`Restored version ${revision.version}`)
      await load()
      window.location.reload()
    } catch (error) {
      setMessage(String(error))
    } finally {
      setRestoring(null)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId])

  return (
    <section className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,.22)', background: 'rgba(15,13,26,.5)' }}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-white">Revision History</h2>
          <p className="font-mono text-xs" style={{ color: '#9B8EC4' }}>เก็บ snapshot ก่อนแก้ไขและ restore ได้</p>
        </div>
        <button type="button" onClick={load} className="font-mono text-xs text-accent hover:underline">refresh</button>
      </div>

      {message && <div className="mb-3 font-mono text-xs text-accent">{message}</div>}

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(124,58,237,.14)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-3 py-2 font-mono text-xs text-purple">Version</th>
              <th className="text-left px-3 py-2 font-mono text-xs text-purple">Action</th>
              <th className="text-left px-3 py-2 font-mono text-xs text-purple">Actor</th>
              <th className="text-left px-3 py-2 font-mono text-xs text-purple">Time</th>
              <th className="text-right px-3 py-2 font-mono text-xs text-purple">Restore</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {revisions.map(item => (
              <tr key={item.id}>
                <td className="px-3 py-2 font-mono text-xs text-white">v{item.version}</td>
                <td className="px-3 py-2 font-mono text-xs" style={{ color: '#A78BFA' }}>{item.action}</td>
                <td className="px-3 py-2 font-mono text-xs" style={{ color: '#9B8EC4' }}>{item.actorEmail ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-xs" style={{ color: '#9B8EC4' }}>{fmt(item.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={restoring === item.id}
                    onClick={() => restore(item)}
                    className="font-mono text-xs text-accent hover:underline disabled:opacity-50"
                  >
                    {restoring === item.id ? 'restoring' : 'restore'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && revisions.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี revision</td></tr>
            )}
            {loading && (
              <tr><td colSpan={5} className="px-3 py-8 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>loading</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
