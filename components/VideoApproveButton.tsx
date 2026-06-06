'use client'

import { useState } from 'react'

// Toggle human approval for a rendered video. When the pipeline's requireApproval
// flag is on, the social queue holds the post until this is approved.
export function VideoApproveButton({ articleId, approved: initial }: { articleId: string; approved: boolean }) {
  const [approved, setApproved] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggle = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/articles/${articleId}/approve-video`, { method: approved ? 'DELETE' : 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed')
      setApproved(!approved)
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={approved
          ? { background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.4)' }
          : { background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff' }}
      >
        {loading ? '...' : approved ? '✓ อนุมัติแล้ว — กดเพื่อยกเลิก' : 'อนุมัติให้โพสต์'}
      </button>
      {error && <span className="font-mono text-xs" style={{ color: '#F87171' }}>{error}</span>}
    </div>
  )
}
