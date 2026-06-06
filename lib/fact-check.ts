import Anthropic from '@anthropic-ai/sdk'
import { eq } from 'drizzle-orm'
import { jsonrepair } from 'jsonrepair'
import { db } from './db'
import { articles, type Article } from './schema'
import { getSetting } from './settings-store'
import { recordAiUsage } from './ai-usage'

// An on-demand AI pass that extracts the factual claims in an article and rates
// how well each is supported, so an editor can review risky statements before
// publishing.

export const FACT_CHECK_VERDICTS = ['supported', 'unsupported', 'uncertain'] as const
export type FactCheckVerdict = (typeof FACT_CHECK_VERDICTS)[number]

export type FactCheckClaim = {
  claim: string
  verdict: FactCheckVerdict
  confidence: number
  note: string
}

export type FactCheckResult = {
  claims: FactCheckClaim[]
  summary: { supported: number; unsupported: number; uncertain: number; total: number }
}

export function normalizeVerdict(value: unknown): FactCheckVerdict {
  return FACT_CHECK_VERDICTS.includes(value as FactCheckVerdict) ? (value as FactCheckVerdict) : 'uncertain'
}

function clampConfidence(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(1, Math.max(0, num))
}

export function summarizeFactCheck(claims: FactCheckClaim[]): FactCheckResult['summary'] {
  const summary = { supported: 0, unsupported: 0, uncertain: 0, total: claims.length }
  for (const claim of claims) summary[claim.verdict]++
  return summary
}

export function parseFactCheckResult(raw: unknown): FactCheckResult {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const rawClaims = Array.isArray(source.claims) ? source.claims : []
  const claims: FactCheckClaim[] = rawClaims
    .map(item => {
      const claim = item as Record<string, unknown>
      return {
        claim: String(claim.claim ?? '').trim(),
        verdict: normalizeVerdict(claim.verdict),
        confidence: clampConfidence(claim.confidence),
        note: String(claim.note ?? '').trim(),
      }
    })
    .filter(claim => claim.claim)
    .slice(0, 50)

  return { claims, summary: summarizeFactCheck(claims) }
}

const FACT_CHECK_SYSTEM = `You are a meticulous fact-checker for a Thai business publication.
Extract the concrete, checkable factual claims from the article (statistics, dates, named facts, attributions, cause/effect statements). Ignore opinions and generic advice.
For each claim decide a verdict:
- "supported": widely established / very likely true.
- "unsupported": likely false, outdated, or contradicted by well-known facts.
- "uncertain": cannot be verified from general knowledge, or needs a source.
Respond ONLY with JSON: {"claims":[{"claim":"...","verdict":"supported|unsupported|uncertain","confidence":0.0-1.0,"note":"short reason in Thai"}]}.
Prioritize the riskiest claims first. Return at most 20 claims.`

export async function runFactCheck(title: string, content: string): Promise<FactCheckResult> {
  const apiKey = (await getSetting('anthropic_api_key')) || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: FACT_CHECK_SYSTEM,
    messages: [{
      role: 'user',
      content: `Title: ${title}\n\nArticle:\n${content.slice(0, 24000)}\n\nFact-check this article.`,
    }],
  })

  await recordAiUsage({ kind: 'fact_check', model: 'claude-sonnet-4-6', inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens })
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return parseFactCheckResult(JSON.parse(jsonrepair(cleaned)))
}

export type StoredFactCheck = FactCheckResult & { checkedAt: string }

// A one-line human summary of a fact-check result, e.g. for the approval LINE
// message. Highlights the risky counts.
export function formatFactCheckSummaryLine(result: FactCheckResult): string {
  const { supported, unsupported, uncertain, total } = result.summary
  if (total === 0) return '🔍 Fact-check: ไม่พบ claim ที่ตรวจสอบได้'
  const flag = unsupported > 0 ? '⚠️' : uncertain > 0 ? '🟡' : '✅'
  return `${flag} Fact-check: ${supported} ผ่าน · ${unsupported} ไม่ผ่าน · ${uncertain} ไม่แน่ใจ`
}

// Runs a fact-check pass and persists it onto the article. Best-effort: a
// failure is logged as failed AI usage and returns null instead of throwing, so
// it never blocks the originating flow (e.g. Content Factory generation).
export async function runAndStoreFactCheck(article: Pick<Article, 'id' | 'title' | 'content'>): Promise<StoredFactCheck | null> {
  if (!article.content?.trim()) return null
  try {
    const result = await runFactCheck(article.title, article.content)
    const stored: StoredFactCheck = { ...result, checkedAt: new Date().toISOString() }
    await db.update(articles).set({ factCheck: stored }).where(eq(articles.id, article.id))
    return stored
  } catch (error) {
    console.error('[fact-check] auto pass failed:', error)
    await recordAiUsage({ kind: 'fact_check', model: 'claude-sonnet-4-6', status: 'failed', articleId: article.id })
    return null
  }
}
