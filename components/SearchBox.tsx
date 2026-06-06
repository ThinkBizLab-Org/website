'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SearchBox({ initial = '', autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(initial)

  return (
    <form
      onSubmit={e => { e.preventDefault(); const q = value.trim(); if (q.length >= 2) router.push(`/search?q=${encodeURIComponent(q)}`) }}
      className="flex items-center gap-2 w-full"
      role="search"
    >
      <input
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder="ค้นหาบทความ…"
        aria-label="ค้นหาบทความ"
        className="flex-1 px-4 py-2.5 rounded-lg border bg-transparent text-white outline-none focus:border-accent"
        style={{ borderColor: 'rgba(124,58,237,.3)' }}
      />
      <button type="submit" className="bg-purple text-white px-4 py-2.5 rounded-lg text-sm font-600 hover:bg-midp transition-colors">ค้นหา</button>
    </form>
  )
}
