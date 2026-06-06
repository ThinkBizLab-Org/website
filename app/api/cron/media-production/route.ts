import { NextResponse } from 'next/server'
import { processMediaProductionQueue } from '@/lib/media-production-processor'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await processMediaProductionQueue({ limit: 5, mode: 'cron' }))
  } catch (error) {
    await reportOperationalEvent({
      name: 'media_production.cron.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Media production cron failed' }, { status: 500 })
  }
}
