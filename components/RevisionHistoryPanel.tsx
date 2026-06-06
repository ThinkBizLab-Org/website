'use client'

import { useEffect, useState } from 'react'

type Revision = {
  id: string
  version: number
  action: string
  actorEmail: string | null
  createdAt: string | null
}

type FieldDiff = { field: string; before: string; after: string; changed: boolean }
type LineDiff = { type: 'same' | 'add' | 'remove'; text: string }
type DiffResult = {
  from: string
  to: string
  fields: FieldDiff[]
  contentDiff: LineDiff[]
  contentSummary: { added: number; removed: number }
}

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

export function RevisionHistoryPanel({ articleId }: { articleId: string }) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [diffing, setDiffing] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffResult | null>(null)

  async function showDiff(revision: Revision) {
    setDiffing(revision.id)
    setMessage('')
    try {
      const res = await fetch(`/api/articles/${articleId}/revisions/diff?from=${revision.id}&to=current`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Diff failed')
      setDiff(data)
    } catch (error) {
      setMessage(String(error))
    } finally {
      setDiffing(null)
    }
  }

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
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    disabled={diffing === item.id}
                    onClick={() => showDiff(item)}
                    className="font-mono text-xs hover:underline disabled:opacity-50 mr-3"
                    style={{ color: '#9B8EC4' }}
                  >
                    {diffing === item.id ? 'diffing' : 'diff'}
                  </button>
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

      {diff && (
        <div className="mt-4 rounded-lg border p-4" style={{ borderColor: 'rgba(124,58,237,.2)', background: 'rgba(10,8,18,.6)' }}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="font-mono text-xs text-white">
              Diff {diff.from} → {diff.to}
              <span className="ml-3" style={{ color: '#10B981' }}>+{diff.contentSummary.added}</span>
              <span className="ml-1" style={{ color: '#F87171' }}>-{diff.contentSummary.removed}</span>
            </h3>
            <button type="button" onClick={() => setDiff(null)} className="font-mono text-xs text-accent hover:underline">close</button>
          </div>

          <div className="space-y-1 mb-4">
            {diff.fields.filter(field => field.changed && field.field !== 'content').map(field => (
              <div key={field.field} className="grid grid-cols-[90px_1fr] gap-2 text-xs">
                <div className="font-mono" style={{ color: '#A78BFA' }}>{field.field}</div>
                <div className="font-mono break-words">
                  <span className="line-through" style={{ color: 'rgba(248,113,113,.8)' }}>{field.before || '∅'}</span>
                  <span className="mx-1" style={{ color: '#9B8EC4' }}>→</span>
                  <span style={{ color: '#86EFAC' }}>{field.after || '∅'}</span>
                </div>
              </div>
            ))}
            {diff.fields.filter(field => field.changed && field.field !== 'content').length === 0 && (
              <div className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ไม่มีการเปลี่ยนแปลง field อื่น</div>
            )}
          </div>

          {diff.contentDiff.some(line => line.type !== 'same') && (
            <div className="rounded border overflow-x-auto" style={{ borderColor: 'rgba(124,58,237,.14)' }}>
              <pre className="font-mono text-[11px] leading-5 p-3 m-0">
                {diff.contentDiff.map((line, index) => (
                  <div
                    key={index}
                    style={{
                      color: line.type === 'add' ? '#86EFAC' : line.type === 'remove' ? '#F87171' : '#9B8EC4',
                      background: line.type === 'add' ? 'rgba(16,185,129,.08)' : line.type === 'remove' ? 'rgba(248,113,113,.08)' : 'transparent',
                    }}
                  >
                    {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}{line.text || ' '}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
