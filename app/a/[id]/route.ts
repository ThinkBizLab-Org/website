import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Encode non-ASCII as numeric entities — pure ASCII output, no charset ambiguity
    .replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0)!.toString(16).toUpperCase()};`)
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ua = req.headers.get('user-agent') ?? ''
  const isSocialBot =
    ua.includes('facebookexternalhit') ||
    ua.includes('Facebot') ||
    ua.includes('Twitterbot') ||
    ua.includes('LinkedInBot') ||
    ua.includes('WhatsApp')

  const [article] = await db.select().from(articles).where(eq(articles.id, params.id))

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com').trim()
  const articleUrl = article?.slug
    ? `${base}/articles/${encodeURIComponent(article.slug)}`
    : base
  const shortUrl = `${base}/a/${params.id}`

  // Regular users: fast server-side redirect — no JS needed
  if (!isSocialBot) {
    return Response.redirect(articleUrl, 302)
  }

  // Social bots (Facebook, etc.): serve a minimal HTML page with OG tags.
  // Bots do NOT execute JS, so a JS redirect would trap them here — which is
  // exactly what we want: they read OG tags, users are already gone via 302.
  if (!article) {
    return new Response('Not Found', { status: 404 })
  }

  const title = esc(article.title ?? '')
  const description = esc(article.excerpt ?? '')
  const image = article.coverImage ? esc(article.coverImage) : ''

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:site_name" content="ThinkBiz Lab">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${esc(shortUrl)}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${image ? `<meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${image ? `<meta name="twitter:image" content="${image}">` : ''}
</head>
<body>
  <p><a href="${esc(articleUrl)}">${title}</a></p>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
