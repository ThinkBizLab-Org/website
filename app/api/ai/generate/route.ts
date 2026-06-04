import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getSetting } from '@/lib/settings-store'

async function getAnthropicKey(): Promise<string> {
  try {
    const key = await getSetting('anthropic_api_key')
    if (key) return key
  } catch { /* fallback to env */ }
  return process.env.ANTHROPIC_API_KEY ?? ''
}

const SYSTEM = `You are a senior business content writer for ThinkBiz Lab, a Thai business intelligence platform focused on GEO (Generative Engine Optimization) — content that ranks well in AI search engines like ChatGPT, Perplexity, Gemini, and Claude.

WRITING RULES:
- Language: Thai primarily, English technical terms OK
- Mobile-first: paragraphs max 2-3 sentences, use line breaks generously
- GEO rules: H2 headings must be questions (end with ?), answer directly in first sentence, include real statistics/numbers/percentages
- Minimum 1,500 Thai characters of text content (excluding HTML tags)
- HTML format: use <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <blockquote>
- Include at least 3 H2 headings that end with ?
- Add a data-driven insight with a number in every section
- Structure: Hook → Main question answered → Key sections → Practical steps → Conclusion
- Each option must take a DIFFERENT angle on the topic

OUTPUT: Return ONLY valid JSON — no markdown, no code fences, no explanation. Exactly this structure:
{
  "options": [
    {
      "angle": "brief angle description in Thai (10-15 words)",
      "title": "compelling Thai title",
      "excerpt": "Thai meta description 120-160 chars, answers main question directly",
      "content": "<h2>คำถาม?</h2><p>...</p>...",
      "category": "one of: Strategy|Finance|Marketing|Startup|SME|Investment|AI & Tech|Global Case",
      "tags": ["tag1","tag2","tag3","tag4","tag5"],
      "aiSummaryQ": "คำถามหลักที่บทความตอบ?",
      "aiSummaryA": "คำตอบตรงๆ 1-2 ประโยค พร้อมตัวเลขที่ชัดเจน",
      "keyPoints": ["จุดสำคัญ 1","จุดสำคัญ 2","จุดสำคัญ 3","จุดสำคัญ 4"],
      "faq": [{"q":"คำถาม?","a":"คำตอบ"},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}],
      "readTime": 5,
      "lineBroadcastMsg": "📊 LINE message max 400 chars with emoji",
      "fbCaption": "Facebook caption 200-400 chars engaging",
      "fbHashtags": "#ThinkBizLab #ธุรกิจ #BusinessInsight #tag4 #tag5",
      "ttCaption": "TikTok hook first line max 150 chars",
      "ttHashtags": "#ThinkBizLab #ธุรกิจ #SME #tag4",
      "igCaption": "Instagram story-format caption 200-400 chars",
      "igHashtags": "#ThinkBizLab #ธุรกิจ #SME #BusinessInsight #นักธุรกิจ #เจ้าของธุรกิจ #Startup #การลงทุน #tag9 #tag10",
      "coverImagePrompt": "English description for AI image generation, 1-2 sentences, photography style, describe scene/subject/mood that fits the article. E.g. 'Business team in a modern office reviewing financial charts on a large screen, professional DSLR photo, natural lighting'",
      "igImagePrompt": "English description for IG square image (1080×1080). Describe a visually striking scene that works well in square format — portrait, close-up, or bold graphic style. E.g. 'Close-up of entrepreneur's hands holding a coffee cup over a laptop with financial charts, warm morning light, square composition'",
      "ttVdoPrompt": "Scene-by-scene TikTok video script in Thai. Total duration MUST NOT exceed 60 seconds. Format each scene as 'Scene N (start-end วิ): [visual description] — [text overlay/action]'. Minimum 3 scenes, maximum 5 scenes. Each scene must specify exact timing, visual style, and on-screen text. End with a CTA scene. E.g.:\nScene 1 (0-10 วิ): hook stat บนพื้นหลังม่วงเข้ม — text overlay ตัวเลขที่น่าตกใจ\nScene 2 (10-30 วิ): motion graphic แสดงปัญหาหลัก — animated bullet points\nScene 3 (30-50 วิ): วิธีแก้ 3 ข้อ — icon + text animation\nScene 4 (50-60 วิ): CTA engagement — ขอให้ผู้ชม แชร์ให้เพื่อนเจ้าของธุรกิจ / คอมเมนต์ว่าเจอปัญหานี้ไหม / กด Follow เพื่อไม่พลาดเคล็ดลับธุรกิจ (เลือก 1-2 อย่างที่เหมาะกับเนื้อหา)"
    }
  ]
}`

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function callClaude(userPrompt: string, retries = 3): Promise<string> {
  const apiKey = await getAnthropicKey()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
  const client = new Anthropic({ apiKey })

  for (let i = 0; i < retries; i++) {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      })
      return message.content[0].type === 'text' ? message.content[0].text : ''
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      const isOverloaded = err?.status === 529 || err?.message?.includes('overloaded')
      if (isOverloaded && i < retries - 1) {
        await sleep(3000 * (i + 1)) // 3s, 6s, 9s
        continue
      }
      throw e
    }
  }
  throw new Error('Max retries exceeded')
}

export async function POST(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  const limited = rateLimit(req, { key: 'ai-generate', limit: 20, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { title, category, tags } = await req.json()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const apiKey = await getAnthropicKey()
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  try {
    const userPrompt = `สร้างบทความธุรกิจ 1 ตัวเลือก สำหรับหัวข้อนี้:

หัวข้อ: ${title}
${category ? `หมวดหมู่ที่แนะนำ: ${category}` : ''}
${tags ? `คำสำคัญที่เกี่ยวข้อง: ${tags}` : ''}

Return only the JSON (options array with exactly 1 item).`

    const text = await callClaude(userPrompt)

    // Strip accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    // jsonrepair handles: unescaped newlines, missing quotes, trailing commas, truncated JSON
    const repaired = jsonrepair(cleaned)
    const parsed = JSON.parse(repaired)

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
