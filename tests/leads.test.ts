import { describe, expect, it } from 'vitest'
import { LEAD_STATUSES, normalizeLeadStatus } from '@/lib/leads'

describe('normalizeLeadStatus', () => {
  it('accepts valid pipeline statuses', () => {
    for (const s of LEAD_STATUSES) expect(normalizeLeadStatus(s)).toBe(s)
  })
  it('rejects unknown values', () => {
    expect(normalizeLeadStatus('archived')).toBeNull()
    expect(normalizeLeadStatus('')).toBeNull()
    expect(normalizeLeadStatus(undefined)).toBeNull()
  })
})
