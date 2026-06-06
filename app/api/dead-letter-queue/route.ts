import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  listDeadLetters,
  normalizeDeadLetterSource,
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

  const queue = await listDeadLetters({ status, source })
  return NextResponse.json({ ok: true, queue })
}
