import { describe, expect, it } from 'vitest'
import { calculateGEOScore, geoScoreLabel } from '@/lib/geo-score'

describe('GEO score', () => {
  it('scores complete GEO content highly', () => {
    const content = [
      '<h2>ตลาดนี้โตแค่ไหน?</h2><p>มีตัวเลข 25% และ 30% ที่ชัดเจน</p>',
      '<h2>SME ควรเริ่มอย่างไร?</h2>',
      '<p>',
      'x'.repeat(1600),
      '</p>',
    ].join('')

    expect(calculateGEOScore({
      content,
      schemaJson: { '@type': 'Article' },
      aiSummaryQ: 'คำถาม?',
      aiSummaryA: 'คำตอบ',
      keyPoints: ['a', 'b', 'c'],
      faqJson: [{ q: 'q1', a: 'a1' }, { q: 'q2', a: 'a2' }],
      excerpt: 'x'.repeat(130),
      tags: ['SME', 'Strategy', 'Growth'],
    })).toBe(100)
  })

  it('labels score ranges', () => {
    expect(geoScoreLabel(85).label).toBe('Excellent')
    expect(geoScoreLabel(65).label).toBe('Good')
    expect(geoScoreLabel(45).label).toBe('Fair')
    expect(geoScoreLabel(10).label).toBe('Poor')
  })
})
