import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { approveContentFactoryTopic, rejectContentFactoryTopic } from '@/lib/content-factory'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '').trim()
    const actor = session?.user?.email ?? 'admin'

    if (action === 'approve') {
      const result = await approveContentFactoryTopic(params.id, actor)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (action === 'reject') {
      const result = await rejectContentFactoryTopic(params.id, String(body.reason ?? ''), actor)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    await reportOperationalEvent({
      name: 'content_factory.topic_action.failed',
      severity: 'error',
      message: errorMessage(error),
      context: { topicId: params.id },
    })
    return NextResponse.json({ error: 'Content Factory topic action failed' }, { status: 500 })
  }
}
