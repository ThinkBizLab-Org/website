import { NextResponse } from 'next/server'
import { runEvergreenReshare } from '@/lib/evergreen'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

// Evergreen re-share. Secured by CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await runEvergreenReshare())
  } catch (error) {
    await reportOperationalEvent({ name: 'evergreen.cron.failed', severity: 'error', message: errorMessage(error) })
    return NextResponse.json({ error: 'Evergreen cron failed' }, { status: 500 })
  }
}
