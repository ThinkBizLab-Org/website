import { describe, expect, it } from 'vitest'
import { evaluateBudget, parseAiBudget } from '@/lib/ai-budget'

describe('ai budget', () => {
  it('parses config and tolerates malformed input', () => {
    expect(parseAiBudget('{"monthlyUsd":50,"autoPause":true}')).toEqual({ monthlyUsd: 50, autoPause: true })
    expect(parseAiBudget({ monthlyUsd: '120', autoPause: 'true' })).toEqual({ monthlyUsd: 120, autoPause: true })
    expect(parseAiBudget('nope')).toEqual({ monthlyUsd: 0, autoPause: false })
    expect(parseAiBudget({ monthlyUsd: -5 })).toEqual({ monthlyUsd: 0, autoPause: false })
  })

  it('is disabled when no cap is set', () => {
    const status = evaluateBudget(99, { monthlyUsd: 0, autoPause: true })
    expect(status.enabled).toBe(false)
    expect(status.exceeded).toBe(false)
  })

  it('flags warn at 80% and exceeded at/over the cap', () => {
    const cfg = { monthlyUsd: 100, autoPause: true }
    expect(evaluateBudget(50, cfg)).toMatchObject({ warn: false, exceeded: false })
    expect(evaluateBudget(85, cfg)).toMatchObject({ warn: true, exceeded: false })
    expect(evaluateBudget(100, cfg)).toMatchObject({ warn: false, exceeded: true })
    expect(evaluateBudget(150, cfg)).toMatchObject({ exceeded: true })
    expect(evaluateBudget(150, cfg).ratio).toBeCloseTo(1.5, 6)
  })
})
