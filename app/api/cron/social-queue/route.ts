import { NextResponse } from 'next/server'
import { processSocialQueue } from '@/lib/social-queue-processor'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await processSocialQueue({ limit: 10, mode: 'cron' }))
  } catch (error) {
    await reportOperationalEvent({
      name: 'social_queue.cron.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Social queue cron failed' }, { status: 500 })
  }
}
