import { describe, expect, it } from 'vitest'
import { igContainerOutcome, needsApprovalHold } from '@/lib/social-queue-processor'

describe('igContainerOutcome', () => {
  it('is ready only when the container has FINISHED processing', () => {
    expect(igContainerOutcome('FINISHED')).toBe('ready')
  })

  it('fails on terminal container states', () => {
    expect(igContainerOutcome('ERROR')).toBe('failed')
    expect(igContainerOutcome('EXPIRED')).toBe('failed')
  })

  it('keeps waiting while in progress or unknown (avoids publishing too early → 9007)', () => {
    expect(igContainerOutcome('IN_PROGRESS')).toBe('pending')
    expect(igContainerOutcome(undefined)).toBe('pending')
    expect(igContainerOutcome(null)).toBe('pending')
    expect(igContainerOutcome('SOMETHING_NEW')).toBe('pending')
  })
})

describe('needsApprovalHold (regression)', () => {
  it('holds tiktok and instagram-with-video until approved when approval is required', () => {
    expect(needsApprovalHold({ platform: 'tiktok', hasVideo: true, requireApproval: true, approved: false })).toBe(true)
    expect(needsApprovalHold({ platform: 'instagram', hasVideo: true, requireApproval: true, approved: false })).toBe(true)
    expect(needsApprovalHold({ platform: 'instagram', hasVideo: false, requireApproval: true, approved: false })).toBe(false)
    expect(needsApprovalHold({ platform: 'tiktok', hasVideo: true, requireApproval: true, approved: true })).toBe(false)
    expect(needsApprovalHold({ platform: 'tiktok', hasVideo: true, requireApproval: false, approved: false })).toBe(false)
  })
})
