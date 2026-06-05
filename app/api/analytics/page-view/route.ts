import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articlePageViews } from '@/lib/schema'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: 'analytics:page-view', limit: 120, windowMs: 60 * 1000 })
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    const articleId = String(body.articleId ?? '').trim()
    const slug = String(body.slug ?? '').trim()
    const path = String(body.path ?? '').trim()
    const referrer = String(body.referrer ?? '').slice(0, 1000) || null

    if (!slug || !path || !path.startsWith('/articles/')) {
      return NextResponse.json({ error: 'Invalid page view' }, { status: 400 })
    }

    await db.insert(articlePageViews).values({
      articleId: articleId || null,
      slug,
      path,
      referrer,
      userAgent: req.headers.get('user-agent')?.slice(0, 1000) ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
