import { describe, expect, it } from 'vitest'
import { DEFAULT_AUTO_APPROVE, parseAutoApproveConfig, shouldAutoApprove } from '@/lib/auto-approve'

const config = { enabled: true, minQualityScore: 85, maxUnsupported: 0, requireFactCheck: true }
const fc = (unsupported: number) => ({ summary: { unsupported } })

describe('parseAutoApproveConfig', () => {
  it('clamps and defaults', () => {
    expect(parseAutoApproveConfig('{"enabled":true,"minQualityScore":200}')).toMatchObject({ enabled: true, minQualityScore: 100 })
    expect(parseAutoApproveConfig('junk')).toEqual(DEFAULT_AUTO_APPROVE)
  })
})

describe('shouldAutoApprove', () => {
  it('approves strong quality + clean fact-check', () => {
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: true, factCheck: fc(0) }, config)).toBe(true)
  })

  it('blocks when disabled, low quality, gate-failed, or unsupported claims', () => {
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: true, factCheck: fc(0) }, { ...config, enabled: false })).toBe(false)
    expect(shouldAutoApprove({ qualityScore: 80, qualityPassed: true, factCheck: fc(0) }, config)).toBe(false)
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: false, factCheck: fc(0) }, config)).toBe(false)
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: true, factCheck: fc(2) }, config)).toBe(false)
  })

  it('blocks on missing fact-check when required, allows when not required', () => {
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: true, factCheck: null }, config)).toBe(false)
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: true, factCheck: null }, { ...config, requireFactCheck: false })).toBe(true)
  })

  it('honors a higher maxUnsupported tolerance', () => {
    expect(shouldAutoApprove({ qualityScore: 90, qualityPassed: true, factCheck: fc(2) }, { ...config, maxUnsupported: 3 })).toBe(true)
  })
})
