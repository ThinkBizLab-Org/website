import { NextResponse } from 'next/server'
import { sendOpsDigest } from '@/lib/ops-digest'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

// Weekly operational digest. Secured by CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const digest = await sendOpsDigest(7)
    return NextResponse.json({ ok: true, digest })
  } catch (error) {
    await reportOperationalEvent({ name: 'ops_digest.cron.failed', severity: 'error', message: errorMessage(error) })
    return NextResponse.json({ error: 'Ops digest cron failed' }, { status: 500 })
  }
}
