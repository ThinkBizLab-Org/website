import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getArticleCostReport, getRecentUsage, summarizeUsage } from '@/lib/ai-usage'
import { evaluateBudget, loadAiBudget, saveAiBudget, parseAiBudget } from '@/lib/ai-budget'
import { logAudit } from '@/lib/audit'

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

  const budgetConfig = await loadAiBudget()
  const month = new Date().toISOString().slice(0, 7)
  const monthSpend = summary.monthly.find(bucket => bucket.key === month)?.costUsd ?? 0
  const budget = { ...budgetConfig, ...evaluateBudget(monthSpend, budgetConfig) }

  const byArticle = await getArticleCostReport(days)

  return NextResponse.json({ ok: true, days, summary, budget, byArticle })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const config = await saveAiBudget(parseAiBudget(body.budget ?? body))
  await logAudit({ session, action: 'ai_budget.update', entityType: 'ai_budget', metadata: { monthlyUsd: config.monthlyUsd, autoPause: config.autoPause } })
  return NextResponse.json({ ok: true, budget: config })
}
