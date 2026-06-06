import { NextResponse } from 'next/server'
import { sendNewsletter } from '@/lib/newsletter'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

// Weekly newsletter send. Secured by CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await sendNewsletter())
  } catch (error) {
    await reportOperationalEvent({ name: 'newsletter.cron.failed', severity: 'error', message: errorMessage(error) })
    return NextResponse.json({ error: 'Newsletter cron failed' }, { status: 500 })
  }
}
