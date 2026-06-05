import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getContentFactoryDashboard } from '@/lib/content-factory-dashboard'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  try {
    return NextResponse.json(await getContentFactoryDashboard())
  } catch (error) {
    await reportOperationalEvent({
      name: 'content_factory.dashboard.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Cannot load Content Factory dashboard' }, { status: 500 })
  }
}
