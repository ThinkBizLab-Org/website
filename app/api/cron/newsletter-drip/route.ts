import { NextResponse } from 'next/server'
import { runNewsletterDrip } from '@/lib/newsletter-lifecycle'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

// Daily onboarding drip for confirmed subscribers. Secured by CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
    const result = await runNewsletterDrip(baseUrl)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    await reportOperationalEvent({ name: 'newsletter_drip.cron.failed', severity: 'error', message: errorMessage(error) })
    return NextResponse.json({ error: 'Newsletter drip cron failed' }, { status: 500 })
  }
}
