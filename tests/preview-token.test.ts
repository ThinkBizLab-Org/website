import { describe, expect, it, vi } from 'vitest'
import { createArticlePreviewToken, verifyArticlePreviewToken } from '@/lib/preview-token'

describe('preview token', () => {
  it('verifies valid article preview tokens', () => {
    vi.stubEnv('PREVIEW_TOKEN_SECRET', 'test-secret')
    const token = createArticlePreviewToken('article-1', 1000)
    expect(verifyArticlePreviewToken('article-1', token)).toBe(true)
    expect(verifyArticlePreviewToken('article-2', token)).toBe(false)
    vi.unstubAllEnvs()
  })

  it('rejects expired tokens', () => {
    vi.stubEnv('PREVIEW_TOKEN_SECRET', 'test-secret')
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = createArticlePreviewToken('article-1', 1000)
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'))
    expect(verifyArticlePreviewToken('article-1', token)).toBe(false)
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })
})
