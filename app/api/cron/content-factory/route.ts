import { NextResponse } from 'next/server'
import { runContentFactory } from '@/lib/content-factory'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runContentFactory()
    return NextResponse.json(result)
  } catch (error) {
    await reportOperationalEvent({
      name: 'cron.content_factory.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Content factory cron failed' }, { status: 500 })
  }
}
