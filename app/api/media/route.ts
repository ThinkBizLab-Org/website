import { NextResponse } from 'next/server'
import { deleteR2Object, listR2Objects, R2_FOLDERS } from '@/lib/r2'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

function allowedPrefix(prefix: string) {
  if (!prefix) return ''
  const folders = new Set([...Object.values(R2_FOLDERS), ''])
  return folders.has(prefix.replace(/\/+$/, '')) ? prefix.replace(/\/+$/, '') : ''
}

export async function GET(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const url = new URL(req.url)
  const prefix = allowedPrefix(url.searchParams.get('prefix') ?? '')
  const cursor = url.searchParams.get('cursor') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? 50)

  try {
    const result = await listR2Objects({ prefix, cursor, limit })
    return NextResponse.json({ ok: true, prefixes: R2_FOLDERS, prefix, ...result })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { session, response } = await requireAdmin('admin')
  if (response) return response

  try {
    const body = await req.json().catch(() => ({}))
    const key = String(body.key ?? '').trim()
    if (!key || key.includes('..') || key.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
    }

    await deleteR2Object(key)
    await logAudit({
      actorEmail: session?.user?.email,
      action: 'media.delete',
      entityType: 'r2_object',
      entityId: key,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
