import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UTM_CONFIG,
  buildPlatformUrls,
  buildUtmUrl,
  parseUtmConfig,
  slugifyCampaign,
} from '@/lib/utm'

describe('utm campaign builder', () => {
  it('appends utm params to an absolute url, preserving existing query', () => {
    const url = buildUtmUrl('https://x.com/p?ref=1', { source: 'facebook', medium: 'social', campaign: 'launch' })
    expect(url).toContain('ref=1')
    expect(url).toContain('utm_source=facebook')
    expect(url).toContain('utm_medium=social')
    expect(url).toContain('utm_campaign=launch')
  })

  it('resolves relative paths against the base url', () => {
    const url = buildUtmUrl('/articles/slug', { source: 'line', medium: 'social', campaign: 'c' }, 'https://www.thinkbizlab.com')
    expect(url.startsWith('https://www.thinkbizlab.com/articles/slug?')).toBe(true)
    expect(url).toContain('utm_source=line')
  })

  it('slugifies campaign names', () => {
    expect(slugifyCampaign('  Launch 2026!! ')).toBe('launch-2026')
    expect(slugifyCampaign('A/B Test')).toBe('a-b-test')
  })

  it('builds one tagged url per platform with the platform source', () => {
    const urls = buildPlatformUrls('/p', 'Spring Sale', DEFAULT_UTM_CONFIG)
    expect(urls.map(u => u.platform)).toEqual(['facebook', 'instagram', 'tiktok', 'line'])
    expect(urls.every(u => u.url.includes('utm_campaign=spring-sale'))).toBe(true)
    expect(urls.find(u => u.platform === 'tiktok')?.url).toContain('utm_source=tiktok')
  })

  it('parses config with defaults and tolerates malformed json', () => {
    const config = parseUtmConfig('{"medium":"paid","source":{"facebook":"fb"}}')
    expect(config.medium).toBe('paid')
    expect(config.source.facebook).toBe('fb')
    expect(config.source.line).toBe('line')
    expect(parseUtmConfig('nope').medium).toBe(DEFAULT_UTM_CONFIG.medium)
  })
})
