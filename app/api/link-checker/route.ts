import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { linkCheckResults } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { runLinkCheck } from '@/lib/link-checker'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { response } = await requireAdmin('viewer')
  if (response) return response

  try {
    const rows = await db.select().from(linkCheckResults).orderBy(desc(linkCheckResults.checkedAt)).limit(500)
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST() {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  try {
    const summary = await runLinkCheck()
    await logAudit({
      session,
      action: 'link-checker.scan',
      entityType: 'link-checker',
      metadata: summary,
    })
    return NextResponse.json(summary)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
