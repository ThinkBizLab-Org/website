import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'
import { isSafeRedirect } from '@/lib/email-tracking'

function siteUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}

// Records an email click then redirects to the (same-origin) target.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('s')
  const target = url.searchParams.get('u') ?? ''
  const site = siteUrl(req)

  if (!isSafeRedirect(target, site)) {
    return NextResponse.redirect(site, { status: 302 })
  }

  if (token) {
    try {
      await db.update(subscribers)
        .set({ lastEngagedAt: new Date(), clickCount: sql`coalesce(${subscribers.clickCount}, 0) + 1` })
        .where(eq(subscribers.unsubscribeToken, token))
    } catch { /* best-effort */ }
  }
  return NextResponse.redirect(target, { status: 302 })
}
