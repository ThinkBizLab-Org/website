'use client'

import { useState } from 'react'

// On-page sharing — free reach. Uses native share when available, plus explicit
// network intents and a copy-link fallback.
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent
  const intents: [string, string][] = [
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ['X', `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`],
    ['LINE', `https://social-plugins.line.me/lineit/share?url=${enc(url)}`],
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const pill = 'font-mono text-[11px] px-3 py-1.5 rounded-full border transition-colors hover:border-accent/60'
  const pillStyle = { borderColor: 'rgba(124,58,237,.25)', color: '#C4B5FD', background: 'rgba(45,27,94,.3)' }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(155,142,196,.5)' }}>แชร์</span>
      {intents.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={pill} style={pillStyle}>{label}</a>
      ))}
      <button onClick={copy} className={pill} style={pillStyle}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}</button>
    </div>
  )
}
