import { NextResponse } from 'next/server'
import { ingestPlatformMetrics } from '@/lib/platform-metrics'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

// Refreshes social post engagement snapshots (IG/FB). Secured by CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await ingestPlatformMetrics()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    await reportOperationalEvent({ name: 'platform_metrics.cron.failed', severity: 'error', message: errorMessage(error) })
    return NextResponse.json({ error: 'Platform metrics cron failed' }, { status: 500 })
  }
}
