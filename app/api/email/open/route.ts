import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'

// 1x1 transparent GIF returned for every request (never leaks whether the token
// matched). Records an email open against the subscriber identified by the token.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

function gif() {
  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Content-Length': String(PIXEL.length),
    },
  })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('s')
  if (token) {
    try {
      await db.update(subscribers)
        .set({ lastEngagedAt: new Date(), openCount: sql`coalesce(${subscribers.openCount}, 0) + 1` })
        .where(eq(subscribers.unsubscribeToken, token))
    } catch { /* best-effort */ }
  }
  return gif()
}
