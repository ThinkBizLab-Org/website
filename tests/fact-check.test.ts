import { describe, expect, it } from 'vitest'
import { normalizeVerdict, parseFactCheckResult, summarizeFactCheck } from '@/lib/fact-check'

describe('fact check', () => {
  it('normalizes verdicts, defaulting unknowns to uncertain', () => {
    expect(normalizeVerdict('supported')).toBe('supported')
    expect(normalizeVerdict('unsupported')).toBe('unsupported')
    expect(normalizeVerdict('false')).toBe('uncertain')
    expect(normalizeVerdict(undefined)).toBe('uncertain')
  })

  it('parses claims, clamps confidence, and drops empty claims', () => {
    const result = parseFactCheckResult({
      claims: [
        { claim: 'GDP grew 10%', verdict: 'unsupported', confidence: 1.4, note: 'too high' },
        { claim: '', verdict: 'supported', confidence: 0.9 },
        { claim: 'Bangkok is the capital', verdict: 'supported', confidence: -1 },
      ],
    })
    expect(result.claims).toHaveLength(2)
    expect(result.claims[0].confidence).toBe(1)
    expect(result.claims[1].confidence).toBe(0)
    expect(result.summary).toEqual({ supported: 1, unsupported: 1, uncertain: 0, total: 2 })
  })

  it('tolerates malformed input', () => {
    expect(parseFactCheckResult(null).claims).toEqual([])
    expect(parseFactCheckResult({}).summary.total).toBe(0)
  })

  it('summarizes claim verdict counts', () => {
    const summary = summarizeFactCheck([
      { claim: 'a', verdict: 'supported', confidence: 1, note: '' },
      { claim: 'b', verdict: 'uncertain', confidence: 0.5, note: '' },
      { claim: 'c', verdict: 'uncertain', confidence: 0.5, note: '' },
    ])
    expect(summary).toEqual({ supported: 1, unsupported: 0, uncertain: 2, total: 3 })
  })
})
