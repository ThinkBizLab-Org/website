import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { reportOperationalEvent } from '@/lib/monitoring'

export async function POST() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  await reportOperationalEvent({
    name: 'monitoring.test',
    severity: 'info',
    message: 'ThinkBiz monitoring test event',
  })

  return NextResponse.json({ ok: true })
}
