import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getRecentUsage, summarizeUsage } from '@/lib/ai-usage'

export async function GET(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const { searchParams } = new URL(req.url)
  const days = Math.min(180, Math.max(1, Number(searchParams.get('days') ?? 60) || 60))

  const rows = await getRecentUsage(days)
  const summary = summarizeUsage(rows.map(row => ({
    kind: row.kind,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    status: row.status,
    createdAt: row.createdAt,
  })))

  return NextResponse.json({ ok: true, days, summary })
}
