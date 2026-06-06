import { describe, expect, it } from 'vitest'
import { articleUrls, buildIndexNowPayload, hostOf } from '@/lib/search-ping'

describe('search ping (indexnow)', () => {
  it('extracts host from a base url', () => {
    expect(hostOf('https://www.thinkbizlab.com')).toBe('www.thinkbizlab.com')
    expect(hostOf('https://www.thinkbizlab.com/')).toBe('www.thinkbizlab.com')
  })

  it('builds absolute, de-duplicated article urls', () => {
    expect(articleUrls('https://x.com/', ['a', 'b', 'a', '', '  '])).toEqual([
      'https://x.com/articles/a',
      'https://x.com/articles/b',
    ])
  })

  it('builds an indexnow payload with host, key, and keyLocation', () => {
    const payload = buildIndexNowPayload({
      base: 'https://www.thinkbizlab.com/',
      key: 'abc123',
      urls: ['https://www.thinkbizlab.com/articles/a'],
    })
    expect(payload).toEqual({
      host: 'www.thinkbizlab.com',
      key: 'abc123',
      keyLocation: 'https://www.thinkbizlab.com/api/indexnow',
      urlList: ['https://www.thinkbizlab.com/articles/a'],
    })
  })
})
