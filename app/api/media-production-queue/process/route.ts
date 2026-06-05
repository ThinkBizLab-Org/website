import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { processMediaProductionQueue } from '@/lib/media-production-processor'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  try {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json(await processMediaProductionQueue({ limit: Number(body.limit ?? 5), mode: 'manual' }))
  } catch (error) {
    await reportOperationalEvent({
      name: 'media_production.manual_process.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Media production queue process failed' }, { status: 500 })
  }
}
