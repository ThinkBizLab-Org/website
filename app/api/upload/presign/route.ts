import { NextResponse } from 'next/server'
import { getR2PresignedPutUrl, parseR2UploadKind } from '@/lib/r2'
import { requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

const ALLOWED_CONTENT_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
])

// Issues a short-lived presigned PUT URL so the browser uploads directly to R2,
// avoiding the serverless request-body limit that breaks large video uploads.
export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'upload-presign', limit: 120, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const filename = String(body.filename ?? '').trim()
  const contentType = String(body.contentType ?? '').trim()
  const kind = parseR2UploadKind(String(body.kind ?? ''))
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 })
  }

  try {
    const result = await getR2PresignedPutUrl({ kind, filename, contentType })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
