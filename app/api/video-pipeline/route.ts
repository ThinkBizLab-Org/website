import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { loadVideoPipelineConfig, parseVideoPipelineConfig, saveVideoPipelineConfig } from '@/lib/video-pipeline-config'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response
  return NextResponse.json({ ok: true, config: await loadVideoPipelineConfig() })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('admin')
  if (response) return response
  const body = await req.json().catch(() => ({}))
  const config = await saveVideoPipelineConfig(parseVideoPipelineConfig(body.config ?? body))
  await logAudit({ session, action: 'video_pipeline.config.update', entityType: 'video_pipeline', metadata: config })
  return NextResponse.json({ ok: true, config })
}
