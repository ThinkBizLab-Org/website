import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import {
  listDeadLetters,
  loadDlqAutoRetry,
  normalizeDeadLetterSource,
  parseDlqAutoRetry,
  saveDlqAutoRetry,
  type DeadLetterStatus,
} from '@/lib/dead-letter-queue'

const STATUSES: DeadLetterStatus[] = ['pending', 'requeued', 'discarded']

export async function GET(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const status = STATUSES.includes(statusParam as DeadLetterStatus) ? (statusParam as DeadLetterStatus) : undefined
  const source = normalizeDeadLetterSource(searchParams.get('source')) ?? undefined

  const [queue, autoRetry] = await Promise.all([listDeadLetters({ status, source }), loadDlqAutoRetry()])
  return NextResponse.json({ ok: true, queue, autoRetry })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const autoRetry = await saveDlqAutoRetry(parseDlqAutoRetry(body.autoRetry ?? body))
  await logAudit({ session, action: 'dead_letter.auto_retry.update', entityType: 'dead_letter_queue', metadata: autoRetry })
  return NextResponse.json({ ok: true, autoRetry })
}
