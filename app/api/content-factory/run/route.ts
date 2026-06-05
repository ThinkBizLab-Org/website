import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { runContentFactory } from '@/lib/content-factory'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  try {
    const body = await req.json().catch(() => ({}))
    const limit = body.limit ? Number(body.limit) : undefined
    const result = await runContentFactory({ limit })

    return NextResponse.json(result)
  } catch (error) {
    await reportOperationalEvent({
      name: 'content_factory.manual_run.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Content Factory run failed' }, { status: 500 })
  }
}
