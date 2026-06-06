import { describe, expect, it } from 'vitest'
import { cleanMediaProgressForRetry } from '@/lib/dead-letter-queue'

describe('cleanMediaProgressForRetry', () => {
  it('reuses generated assets but resets to the assets stage (drops stale render id)', () => {
    const cleaned = cleanMediaProgressForRetry({
      stage: 'render',
      sceneBgUrls: { 0: 'https://r2/a.jpg' },
      voiceUrl: 'https://r2/v.mp3',
      captionTimings: [{ text: 'x', startSec: 0, endSec: 1 }],
      renderId: 'stale',
      renderBucket: 'b',
    })
    expect(cleaned).toEqual({
      stage: 'assets',
      sceneBgUrls: { 0: 'https://r2/a.jpg' },
      voiceUrl: 'https://r2/v.mp3',
      captionTimings: [{ text: 'x', startSec: 0, endSec: 1 }],
    })
  })

  it('returns null for non-video / empty progress', () => {
    expect(cleanMediaProgressForRetry(null)).toBeNull()
    expect(cleanMediaProgressForRetry({})).toBeNull()
    expect(cleanMediaProgressForRetry('nope')).toBeNull()
  })
})
