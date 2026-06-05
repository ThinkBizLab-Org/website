import { NextResponse } from 'next/server'
import { runBackup } from '@/lib/backups'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const job = await runBackup('cron')
  return NextResponse.json({ ok: job.status === 'success', job }, { status: job.status === 'success' ? 200 : 500 })
}

export async function POST() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const job = await runBackup('manual')
  return NextResponse.json({ ok: job.status === 'success', job }, { status: job.status === 'success' ? 200 : 500 })
}
