import { describe, expect, it } from 'vitest'
import { formatFactCheckSummaryLine } from '@/lib/fact-check'

const result = (supported: number, unsupported: number, uncertain: number) => ({
  claims: [],
  summary: { supported, unsupported, uncertain, total: supported + unsupported + uncertain },
})

describe('formatFactCheckSummaryLine', () => {
  it('warns when there are unsupported claims', () => {
    const line = formatFactCheckSummaryLine(result(3, 2, 1))
    expect(line.startsWith('⚠️')).toBe(true)
    expect(line).toContain('3 ผ่าน')
    expect(line).toContain('2 ไม่ผ่าน')
    expect(line).toContain('1 ไม่แน่ใจ')
  })

  it('flags caution when only uncertain claims exist', () => {
    expect(formatFactCheckSummaryLine(result(2, 0, 1)).startsWith('🟡')).toBe(true)
  })

  it('shows all-clear when everything is supported', () => {
    expect(formatFactCheckSummaryLine(result(4, 0, 0)).startsWith('✅')).toBe(true)
  })

  it('handles no checkable claims', () => {
    expect(formatFactCheckSummaryLine(result(0, 0, 0))).toContain('ไม่พบ claim')
  })
})
