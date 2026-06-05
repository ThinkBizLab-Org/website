import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { processSocialQueue } from '@/lib/social-queue-processor'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  try {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json(await processSocialQueue({ limit: Number(body.limit ?? 10), mode: 'manual' }))
  } catch (error) {
    await reportOperationalEvent({
      name: 'social_queue.manual_process.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Social queue process failed' }, { status: 500 })
  }
}
