export const dynamic = 'force-dynamic'

import { readdir } from 'fs/promises'
import path from 'path'
import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { backupJobs } from '@/lib/schema'
import { BackupActions } from '@/components/BackupActions'

export const metadata = { title: 'System Status' }

const EXPECTED_TABLES = [
  'articles',
  'categories',
  'settings',
  'subscribers',
  'audit_logs',
  'publish_attempts',
  'admin_users',
  'article_revisions',
  'article_page_views',
  'social_post_queue',
  'link_check_results',
  'operational_events',
  'backup_jobs',
]

function fmt(date: Date | null) {
  return date ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function statusColor(status: string) {
  if (status === 'success' || status === 'present') return '#10B981'
  if (status === 'failed' || status === 'missing') return '#F87171'
  return '#F59E0B'
}

export default async function SystemPage() {
  let migrationFiles: string[] = []
  let tableRows: { table_name: string }[] = []
  let jobs: (typeof backupJobs.$inferSelect)[] = []

  try {
    migrationFiles = (await readdir(path.join(process.cwd(), 'scripts/sql'))).filter(file => file.endsWith('.sql')).sort()
  } catch {
    // Migration files unavailable in this runtime.
  }

  try {
    tableRows = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      and table_name = any(${EXPECTED_TABLES})
    `) as unknown as { table_name: string }[]
    jobs = await db.select().from(backupJobs).orderBy(desc(backupJobs.startedAt)).limit(50)
  } catch {
    // DB unavailable or migrations not applied.
  }

  const presentTables = new Set(tableRows.map(row => row.table_name))
  const latest = jobs[0] ?? null

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white mb-1">System Status</h1>
          <p className="text-sm" style={{ color: '#9B8EC4' }}>Migration checklist และ backup jobs</p>
        </div>
        <BackupActions />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Migration files', migrationFiles.length, '#A78BFA'],
          ['Tables present', `${presentTables.size}/${EXPECTED_TABLES.length}`, presentTables.size === EXPECTED_TABLES.length ? '#10B981' : '#F59E0B'],
          ['Backup jobs', jobs.length, '#38BDF8'],
          ['Latest backup', latest?.status ?? 'none', latest?.status ? statusColor(latest.status) : '#9B8EC4'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.5)' }}>
            <div className="font-heading text-2xl font-bold mb-1 break-words" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs font-mono" style={{ color: '#9B8EC4' }}>{String(label)}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Migration Files</h2>
        <div className="rounded-xl border p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
          {migrationFiles.map(file => (
            <div key={file} className="font-mono text-xs px-3 py-2 rounded-lg border" style={{ color: '#A78BFA', borderColor: 'rgba(124,58,237,.18)', background: 'rgba(124,58,237,.06)' }}>{file}</div>
          ))}
          {migrationFiles.length === 0 && <div className="font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>No migration files found</div>}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Database Tables</h2>
        <div className="rounded-xl border p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(30,16,48,.35)' }}>
          {EXPECTED_TABLES.map(table => {
            const present = presentTables.has(table)
            return (
              <div key={table} className="flex items-center justify-between gap-3 font-mono text-xs px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(124,58,237,.18)', background: 'rgba(124,58,237,.06)' }}>
                <span style={{ color: '#C4B5FD' }}>{table}</span>
                <span style={{ color: present ? '#10B981' : '#F87171' }}>{present ? 'present' : 'missing'}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-bold text-white mb-3">Backup Jobs</h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(124,58,237,.18)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(45,27,94,.3)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Status</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple">Trigger</th>
                <th className="text-left px-4 py-3 font-mono text-xs text-purple hidden md:table-cell">R2 Key</th>
                <th className="text-right px-4 py-3 font-mono text-xs text-purple">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(124,58,237,.08)' }}>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td className="px-4 py-3 align-top font-mono text-[10px] uppercase font-bold" style={{ color: statusColor(job.status) }}>{job.status}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: '#9B8EC4' }}>{job.trigger}</td>
                  <td className="px-4 py-3 align-top hidden md:table-cell font-mono text-xs max-w-xl truncate" style={{ color: '#9B8EC4' }}>
                    {job.url ? <a href={job.url} target="_blank" rel="noopener" className="text-accent hover:underline">{job.r2Key}</a> : (job.error ?? job.r2Key ?? '-')}
                  </td>
                  <td className="px-4 py-3 align-top text-right font-mono text-[10px]" style={{ color: 'rgba(155,142,196,.5)' }}>{fmt(job.startedAt)}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center font-mono text-xs" style={{ color: 'rgba(155,142,196,.5)' }}>ยังไม่มี backup jobs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
