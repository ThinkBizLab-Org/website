import { NextResponse } from 'next/server'
import { runReengagement } from '@/lib/newsletter-lifecycle'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

// Weekly win-back for inactive subscribers. Secured by CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
    const result = await runReengagement(baseUrl)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    await reportOperationalEvent({ name: 'reengagement.cron.failed', severity: 'error', message: errorMessage(error) })
    return NextResponse.json({ error: 'Re-engagement cron failed' }, { status: 500 })
  }
}
