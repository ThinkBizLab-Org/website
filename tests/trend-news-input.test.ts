import { describe, expect, it } from 'vitest'
import { parseTrendNewsInputs, trendNewsToTopicSeeds } from '@/lib/trend-news-input'

describe('trend/news input', () => {
  it('parses curated trend lines by priority', () => {
    const inputs = parseTrendNewsInputs([
      'ค่าแรงขั้นต่ำปรับขึ้น | Finance | SME, Cost | https://example.com | คุมต้นทุนอย่างไร | 4',
      '!AI agent เริ่มใช้จริงในทีมขาย | AI & Tech | AI, Sales',
      '# ignored comment',
    ].join('\n'))

    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toMatchObject({
      headline: 'AI agent เริ่มใช้จริงในทีมขาย',
      category: 'AI & Tech',
      priority: 5,
    })
    expect(inputs[1].tags).toEqual(['SME', 'Cost'])
  })

  it('turns trends into dedupe-ready topic seeds', () => {
    const seeds = trendNewsToTopicSeeds('ค่าแรงขั้นต่ำปรับขึ้น | Finance | SME, Cost | https://example.com | เจ้าของกิจการควรคุมต้นทุนอย่างไร | 4')

    expect(seeds[0]).toEqual({
      topic: 'ค่าแรงขั้นต่ำปรับขึ้น: เจ้าของกิจการควรคุมต้นทุนอย่างไร',
      category: 'Finance',
      tags: ['SME', 'Cost', 'Trend', 'News'],
    })
  })

  it('keeps question headlines as the topic', () => {
    const seeds = trendNewsToTopicSeeds('ทำไมเงินบาทผันผวนกระทบ SME? | Finance')

    expect(seeds[0].topic).toBe('ทำไมเงินบาทผันผวนกระทบ SME?')
  })
})
