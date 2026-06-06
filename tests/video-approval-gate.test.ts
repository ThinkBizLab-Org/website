import { describe, expect, it } from 'vitest'
import { needsApprovalHold } from '@/lib/social-queue-processor'

describe('needsApprovalHold', () => {
  it('holds unapproved TikTok and Instagram-video posts when approval is required', () => {
    expect(needsApprovalHold({ platform: 'tiktok', hasVideo: true, requireApproval: true, approved: false })).toBe(true)
    expect(needsApprovalHold({ platform: 'instagram', hasVideo: true, requireApproval: true, approved: false })).toBe(true)
  })

  it('does not hold once approved', () => {
    expect(needsApprovalHold({ platform: 'tiktok', hasVideo: true, requireApproval: true, approved: true })).toBe(false)
  })

  it('does not hold when approval is off', () => {
    expect(needsApprovalHold({ platform: 'tiktok', hasVideo: true, requireApproval: false, approved: false })).toBe(false)
  })

  it('never holds non-video posts', () => {
    expect(needsApprovalHold({ platform: 'facebook', hasVideo: false, requireApproval: true, approved: false })).toBe(false)
    expect(needsApprovalHold({ platform: 'instagram', hasVideo: false, requireApproval: true, approved: false })).toBe(false)
    expect(needsApprovalHold({ platform: 'line', hasVideo: false, requireApproval: true, approved: false })).toBe(false)
  })
})
