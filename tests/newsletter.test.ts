import { describe, expect, it } from 'vitest'
import { DEFAULT_NEWSLETTER, buildNewsletterContent, parseNewsletterConfig } from '@/lib/newsletter'

describe('parseNewsletterConfig', () => {
  it('clamps and falls back', () => {
    expect(parseNewsletterConfig('{"enabled":true,"lookbackDays":1000,"maxArticles":0}')).toEqual({
      enabled: true, lookbackDays: 90, maxArticles: 1,
    })
    expect(parseNewsletterConfig('nope')).toEqual(DEFAULT_NEWSLETTER)
  })
})

describe('buildNewsletterContent', () => {
  it('uses the single title as subject when there is one article', () => {
    const { subject, text } = buildNewsletterContent([{ title: 'Solo', slug: 'solo', excerpt: null }], 'https://x.com/')
    expect(subject).toBe('ThinkBiz Lab: Solo')
    expect(text).toContain('https://x.com/articles/solo')
  })

  it('summarizes the count for multiple articles and includes excerpts + links', () => {
    const { subject, text } = buildNewsletterContent([
      { title: 'A', slug: 'a', excerpt: 'about a' },
      { title: 'B', slug: 'b', excerpt: null },
    ], 'https://x.com')
    expect(subject).toContain('2')
    expect(text).toContain('• A')
    expect(text).toContain('about a')
    expect(text).toContain('https://x.com/articles/b')
  })
})
