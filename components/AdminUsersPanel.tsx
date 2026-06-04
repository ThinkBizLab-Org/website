'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type AdminUser = {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  active: boolean | null
}

const roles = ['owner', 'admin', 'editor', 'viewer'] as const

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminUser['role']>('editor')
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/admin-users')
    const data = await res.json()
    if (res.ok) setUsers(data.users)
    else setMessage(data.error ?? 'Cannot load admin users')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? 'Cannot save user')
      return
    }
    setEmail('')
    setName('')
    setRole('editor')
    setMessage('บันทึก role แล้ว')
    load()
  }

  async function remove(id: string, targetEmail: string) {
    if (!window.confirm(`Remove admin access for ${targetEmail}?`)) return
    const res = await fetch(`/api/admin-users/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" className="px-4 py-3 rounded-lg bg-black/30 border text-white text-sm" style={{ borderColor: 'rgba(124,58,237,.2)' }} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ" className="px-4 py-3 rounded-lg bg-black/30 border text-white text-sm" style={{ borderColor: 'rgba(124,58,237,.2)' }} />
        <select value={role} onChange={e => setRole(e.target.value as AdminUser['role'])} className="px-4 py-3 rounded-lg bg-black/30 border text-white text-sm" style={{ borderColor: 'rgba(124,58,237,.2)' }}>
          {roles.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="bg-purple text-white px-5 py-3 rounded-lg text-sm font-semibold">Save</button>
      </form>

      {message && <div className="font-mono text-xs text-accent">{message}</div>}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(45,27,94,.3)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Email</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Name</th>
              <th className="text-left px-4 py-3 font-mono text-xs text-purple">Role</th>
              <th className="text-right px-4 py-3 font-mono text-xs text-purple">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-mono text-xs text-accent">{user.email}</td>
                <td className="px-4 py-3 text-white">{user.name ?? '-'}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#A78BFA' }}>{user.role}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => remove(user.id, user.email)} className="font-mono text-xs text-red-300 hover:underline">remove</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี role ใน database ระบบจะ fallback จาก ADMIN_EMAILS</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
