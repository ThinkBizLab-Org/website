import { describe, expect, it } from 'vitest'
import { isDuplicateTopic, normalizeTopic, pickUniqueTopicSeed, topicSimilarity } from '@/lib/topic-deduplication'

describe('topic deduplication', () => {
  it('normalizes punctuation and casing', () => {
    expect(normalizeTopic('  AI ช่วย SME ได้อย่างไร?  ')).toBe('ai ช่วย sme ได้อย่างไร')
  })

  it('detects exact and near duplicate topics', () => {
    const existing = [
      { title: 'AI ช่วยลดงานซ้ำในธุรกิจขนาดเล็กได้อย่างไร?', category: 'AI & Tech' },
      { title: 'กลยุทธ์ตั้งราคาที่ทำให้กำไรเพิ่มโดยไม่ต้องขายมากขึ้น?', category: 'Strategy' },
    ]

    expect(isDuplicateTopic('AI ช่วยลดงานซ้ำในธุรกิจขนาดเล็กได้อย่างไร', existing)).toBe(true)
    expect(isDuplicateTopic('กลยุทธ์ตั้งราคาที่ทำให้กำไรเพิ่ม', existing)).toBe(true)
    expect(isDuplicateTopic('Founder ควรวัดตัวเลขอะไรทุกสัปดาห์?', existing)).toBe(false)
  })

  it('scores token overlap conservatively', () => {
    expect(topicSimilarity('SME cash flow strategy', 'SME cash flow checklist')).toBeGreaterThan(0.4)
    expect(topicSimilarity('marketing funnel', 'stock portfolio')).toBe(0)
  })

  it('picks the next unique seed when the first seed is already used', () => {
    const seeds = [
      { topic: 'AI ช่วยลดงานซ้ำในธุรกิจขนาดเล็กได้อย่างไร?', category: 'AI & Tech', tags: ['AI'] },
      { topic: 'Founder ควรวัดตัวเลขอะไรทุกสัปดาห์?', category: 'Startup', tags: ['Metrics'] },
    ]
    const seed = pickUniqueTopicSeed(seeds, 0, [{ title: seeds[0].topic, category: seeds[0].category }])

    expect(seed?.topic).toBe(seeds[1].topic)
  })

  it('returns null when every seed is duplicate', () => {
    const seeds = [
      { topic: 'AI ช่วยลดงานซ้ำในธุรกิจขนาดเล็กได้อย่างไร?', category: 'AI & Tech', tags: ['AI'] },
    ]
    const seed = pickUniqueTopicSeed(seeds, 0, [{ title: seeds[0].topic, category: seeds[0].category }])

    expect(seed).toBeNull()
  })
})
