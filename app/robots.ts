import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com'
  return {
    rules: [
      { userAgent: '*',                  allow: '/',  disallow: ['/admin', '/api'] },
      { userAgent: 'facebookexternalhit', allow: '/' },
      { userAgent: 'Facebot',            allow: '/' },
      { userAgent: 'GPTBot',             allow: '/' },
      { userAgent: 'anthropic-ai',       allow: '/' },
      { userAgent: 'ClaudeBot',          allow: '/' },
      { userAgent: 'PerplexityBot',      allow: '/' },
      { userAgent: 'GoogleOther',        allow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
