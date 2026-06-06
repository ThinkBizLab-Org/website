import { describe, expect, it } from 'vitest'
import { buildTrendRefinePrompt, cleanHeadline, feedTitlesToSeeds, normalizeRefinedSeeds, parseFeedConfig, parseFeedTitles } from '@/lib/trend-feeds'

describe('parseFeedTitles', () => {
  it('extracts RSS item titles (with CDATA) and skips the channel title', () => {
    const xml = `<rss><channel><title>My News Site</title>
      <item><title><![CDATA[ธนาคารปรับขึ้นดอกเบี้ย กระทบ SME]]></title></item>
      <item><title>ส่งออกไทยฟื้นตัว Q2</title></item>
    </channel></rss>`
    expect(parseFeedTitles(xml)).toEqual(['ธนาคารปรับขึ้นดอกเบี้ย กระทบ SME', 'ส่งออกไทยฟื้นตัว Q2'])
  })

  it('extracts Atom entry titles and respects the limit', () => {
    const xml = `<feed><title>Site</title>
      <entry><title>หัวข้อหนึ่งที่ยาวพอ</title></entry>
      <entry><title>หัวข้อสองที่ยาวพอ</title></entry>
    </feed>`
    expect(parseFeedTitles(xml, 1)).toEqual(['หัวข้อหนึ่งที่ยาวพอ'])
  })
})

describe('cleanHeadline', () => {
  it('strips a trailing source suffix and decodes entities', () => {
    expect(cleanHeadline('ส่งออกไทยฟื้นตัว Q2 &amp; ลงทุนเพิ่ม - The Nation')).toBe('ส่งออกไทยฟื้นตัว Q2 & ลงทุนเพิ่ม')
  })
})

describe('feedTitlesToSeeds', () => {
  it('makes question-style topics, dedupes, drops too-short, keeps existing questions', () => {
    const seeds = feedTitlesToSeeds(['ดอกเบี้ยขึ้นแล้วไง?', 'ดอกเบี้ยขึ้นแล้วไง?', 'สั้น', 'ส่งออกไทยฟื้นตัวชัดเจน'], 'Finance')
    expect(seeds).toEqual([
      { topic: 'ดอกเบี้ยขึ้นแล้วไง?', category: 'Finance', tags: ['Trend', 'News'] },
      { topic: 'ส่งออกไทยฟื้นตัวชัดเจน: ธุรกิจ SME ควรปรับตัวอย่างไร?', category: 'Finance', tags: ['Trend', 'News'] },
    ])
  })
})

describe('normalizeRefinedSeeds', () => {
  it('keeps valid items, fills default tags, drops short/garbage, caps at 8', () => {
    const seeds = normalizeRefinedSeeds([
      { topic: 'จัดการกระแสเงินสดอย่างไรในภาวะดอกเบี้ยขาขึ้น?', category: 'Finance', tags: ['SME', 'Cashflow'] },
      { topic: 'สั้น', category: 'X' },
      { topic: 'ใช้ AI ลดต้นทุนการตลาดของ SME ได้จริงไหม?', category: '', tags: [] },
      'not an object',
    ])
    expect(seeds).toEqual([
      { topic: 'จัดการกระแสเงินสดอย่างไรในภาวะดอกเบี้ยขาขึ้น?', category: 'Finance', tags: ['SME', 'Cashflow'] },
      { topic: 'ใช้ AI ลดต้นทุนการตลาดของ SME ได้จริงไหม?', category: 'Strategy', tags: ['Trend', 'News'] },
    ])
  })
  it('returns [] for non-array input', () => {
    expect(normalizeRefinedSeeds(null)).toEqual([])
    expect(normalizeRefinedSeeds({})).toEqual([])
  })
})

describe('buildTrendRefinePrompt', () => {
  it('lists candidate topics numbered', () => {
    const prompt = buildTrendRefinePrompt([
      { topic: 'A', category: 'Finance', tags: [] },
      { topic: 'B', category: 'Strategy', tags: [] },
    ])
    expect(prompt).toContain('1. A')
    expect(prompt).toContain('2. B')
  })
})

describe('parseFeedConfig', () => {
  it('parses url|category lines and rejects non-http entries', () => {
    const cfg = parseFeedConfig('https://a.com/rss | Finance\n# comment\nnot-a-url\nhttps://b.com/feed')
    expect(cfg).toEqual([
      { url: 'https://a.com/rss', category: 'Finance' },
      { url: 'https://b.com/feed', category: 'Strategy' },
    ])
  })
})
