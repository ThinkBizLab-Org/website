import { describe, expect, it } from 'vitest'
import { formatOpsDigest } from '@/lib/ops-digest'

describe('formatOpsDigest', () => {
  it('renders all sections with counts', () => {
    const msg = formatOpsDigest({
      rangeDays: 7,
      published: { count: 2, titles: ['Article A', 'Article B'] },
      ai: { generations: 5, failed: 1, costUsd: 3.456 },
      dlqPending: 4,
    })
    expect(msg).toContain('last 7 days')
    expect(msg).toContain('Published: 2')
    expect(msg).toContain('• Article A')
    expect(msg).toContain('5 generations · 1 failed · $3.46')
    expect(msg).toContain('Dead letters pending: 4')
  })

  it('caps the listed titles at five', () => {
    const titles = Array.from({ length: 9 }, (_, i) => `T${i}`)
    const msg = formatOpsDigest({
      rangeDays: 7,
      published: { count: 9, titles },
      ai: { generations: 0, failed: 0, costUsd: 0 },
      dlqPending: 0,
    })
    expect(msg).toContain('• T4')
    expect(msg).not.toContain('• T5')
  })
})
