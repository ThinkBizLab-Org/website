import { NextResponse } from 'next/server'
import { parseR2UploadKind, uploadToR2 } from '@/lib/r2'
import { requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 250 * 1024 * 1024

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'upload', limit: 120, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const filename = searchParams.get('filename')
  const kind = parseR2UploadKind(searchParams.get('kind'))
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

  try {
    const contentType = req.headers.get('content-type') ?? 'application/octet-stream'
    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Only image and video uploads are allowed' }, { status: 400 })
    }

    const arrayBuffer = await req.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (buffer.byteLength > maxBytes) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(maxBytes / 1024 / 1024)}MB` }, { status: 413 })
    }

    const uploaded = await uploadToR2({ body: buffer, filename, contentType, kind })
    return NextResponse.json(uploaded)
  } catch (e) {
    console.error('[upload] R2 upload failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
