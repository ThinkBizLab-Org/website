import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getSetting } from '@/lib/settings-store'

// Build a photography-style prompt from article content
function buildPrompt(title: string, category: string, excerpt: string, keyPoints: string): string {
  const categoryScenes: Record<string, string> = {
    'Strategy':    'corporate strategy meeting, business professionals in modern office, aerial city view',
    'Finance':     'financial charts, stock market data, business analytics dashboard, coins and graphs',
    'Marketing':   'digital marketing concept, social media screens, creative agency, colorful campaign',
    'Startup':     'startup office culture, entrepreneurs working, innovation lab, tech workspace',
    'SME':         'small business owner, local shop, entrepreneur portrait, Thai business environment',
    'Investment':  'investment portfolio, real estate, stock exchange floor, wealth management',
    'AI & Tech':   'artificial intelligence visualization, futuristic technology, neural network, digital transformation',
    'Global Case': 'global business, world map, international trade, multicultural team meeting',
  }

  const scene = categoryScenes[category] || 'business professionals, modern corporate environment, success concept'

  // Build context from article content
  const contentParts: string[] = []
  if (excerpt) contentParts.push(excerpt.slice(0, 120))
  if (keyPoints) contentParts.push(keyPoints.slice(0, 100))
  const contentContext = contentParts.join('. ')

  return `Professional editorial photograph for business article titled "${title}". ${contentContext ? `Article context: ${contentContext}. ` : ''}Visual style: ${scene}. High quality DSLR photo, natural lighting, sharp focus, magazine cover style, 16:9 aspect ratio, photorealistic.`
}

async function getFalKey(): Promise<string> {
  // DB key takes precedence over env var
  try {
    const key = await getSetting('fal_api_key')
    if (key) return key
  } catch { /* ignore */ }
  return process.env.FAL_KEY ?? ''
}


export async function GET(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const limited = rateLimit(req, { key: 'generate-cover', limit: 30, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'ThinkBiz Lab'
  const category = searchParams.get('category') || ''
  const excerpt = searchParams.get('excerpt') || ''
  const keyPoints = searchParams.get('keyPoints') || ''
  const customPrompt = searchParams.get('prompt') || ''
  const format = searchParams.get('format') || 'cover' // 'cover' = 1200×630, 'ig' = 1080×1080

  const falKey = await getFalKey()

  // ── No fal.ai key: return error JSON so form shows real message ──────
  if (!falKey) {
    return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })
  }

  // ── fal.ai Flux Schnell ──────────────────────────────────────────────
  const basePrompt = buildPrompt(title, category, excerpt, keyPoints)
  const prompt = customPrompt.trim()
    ? `${basePrompt} Additional details: ${customPrompt.trim()}`
    : basePrompt

  try {
    const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: format === 'ig' ? { width: 1080, height: 1080 } : { width: 1200, height: 630 },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `fal.ai error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const imageUrl: string = data?.images?.[0]?.url

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image returned from fal.ai' }, { status: 500 })
    }

    // Fetch the image and stream it back
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to fetch generated image: ${imgRes.status}` }, { status: 500 })
    }

    const buffer = await imgRes.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
