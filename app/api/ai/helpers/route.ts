import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getSetting } from '@/lib/settings-store'

const helperSchema = z.object({
  kind: z.enum(['seo', 'faq', 'social']),
  title: z.string().trim().max(300),
  excerpt: z.string().trim().max(1000).optional().default(''),
  content: z.string().trim().max(50000).optional().default(''),
  category: z.string().trim().max(120).optional().default(''),
  tags: z.string().trim().max(500).optional().default(''),
})

async function getAnthropicKey(): Promise<string> {
  try {
    const key = await getSetting('anthropic_api_key')
    if (key) return key
  } catch {
    // fallback to env
  }
  return process.env.ANTHROPIC_API_KEY ?? ''
}

function promptFor(data: z.infer<typeof helperSchema>) {
  const context = `Title: ${data.title}
Category: ${data.category || '-'}
Tags: ${data.tags || '-'}
Excerpt: ${data.excerpt || '-'}
Content excerpt: ${data.content.replace(/<[^>]+>/g, ' ').slice(0, 6000) || '-'}`

  if (data.kind === 'seo') {
    return `${context}

Create SEO/GEO helper fields for a Thai business article.
Return only JSON:
{
  "title": "improved Thai title",
  "excerpt": "120-160 char Thai meta description",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "aiSummaryQ": "main question?",
  "aiSummaryA": "direct 1-2 sentence answer with a number if possible",
  "keyPoints": ["point1","point2","point3","point4"]
}`
  }

  if (data.kind === 'faq') {
    return `${context}

Create 5 GEO-friendly FAQ items in Thai. Questions should match what business owners would ask in AI search.
Return only JSON:
{ "faq": [{ "q": "question?", "a": "concise answer" }] }`
  }

  return `${context}

Create Thai social helper copy for this article.
Return only JSON:
{
  "lineBroadcastMsg": "LINE broadcast under 400 chars",
  "fbCaption": "Facebook caption 200-400 chars",
  "fbHashtags": "#ThinkBizLab #ธุรกิจ ...",
  "ttCaption": "TikTok hook under 150 chars",
  "ttHashtags": "#ThinkBizLab #SME ...",
  "igCaption": "Instagram caption 200-400 chars",
  "igHashtags": "#ThinkBizLab #ธุรกิจ ..."
}`
}

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'ai-helpers', limit: 60, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const parsed = helperSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid helper request' }, { status: 400 })

  const apiKey = await getAnthropicKey()
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: 'You are a Thai business editor for ThinkBiz Lab. Return valid JSON only.',
      messages: [{ role: 'user', content: promptFor(parsed.data) }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    return NextResponse.json(JSON.parse(jsonrepair(cleaned)))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
