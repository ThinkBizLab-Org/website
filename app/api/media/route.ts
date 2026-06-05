import { NextResponse } from 'next/server'
import { deleteR2Object, listR2Objects, R2_FOLDERS } from '@/lib/r2'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'

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
    const usage = await collectMediaUsage(result.objects.map(item => item.url))
    return NextResponse.json({
      ok: true,
      prefixes: R2_FOLDERS,
      prefix,
      ...result,
      objects: result.objects.map(item => ({
        ...item,
        usedBy: usage.get(item.url) ?? [],
        usedByCount: usage.get(item.url)?.length ?? 0,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function collectMediaUsage(urls: string[]) {
  const usage = new Map<string, { id: string; title: string; slug: string }[]>()
  if (urls.length === 0) return usage

  const rows = await db.select({
    id: articles.id,
    title: articles.title,
    slug: articles.slug,
    coverImage: articles.coverImage,
    content: articles.content,
    ttVideoUrl: articles.ttVideoUrl,
    igVideoUrl: articles.igVideoUrl,
    igImage: articles.igImage,
  }).from(articles)

  for (const article of rows) {
    const haystack = [
      article.coverImage,
      article.content,
      article.ttVideoUrl,
      article.igVideoUrl,
      article.igImage,
    ].filter(Boolean).join('\n')

    for (const url of urls) {
      if (!haystack.includes(url)) continue
      const items = usage.get(url) ?? []
      items.push({ id: article.id, title: article.title, slug: article.slug })
      usage.set(url, items)
    }
  }

  return usage
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
