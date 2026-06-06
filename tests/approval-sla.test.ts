import { describe, expect, it } from 'vitest'
import {
  approvalSlaAlertKey,
  approvalSlaBreaches,
  formatApprovalSlaLineMessage,
  parseApprovalSlaAlertedKeys,
  serializeApprovalSlaAlertedKeys,
} from '@/lib/approval-sla'

describe('approval SLA alerts', () => {
  const now = new Date('2026-06-06T10:00:00.000Z')

  it('finds generated and notified topics past SLA', () => {
    const breaches = approvalSlaBreaches([
      {
        id: 'late',
        topic: 'Late topic',
        status: 'notified',
        scheduledAt: new Date('2026-06-06T08:00:00.000Z'),
        lineNotifiedAt: new Date('2026-06-05T08:00:00.000Z'),
        updatedAt: new Date('2026-06-05T08:00:00.000Z'),
        createdAt: new Date('2026-06-05T07:00:00.000Z'),
        articleId: 'article-1',
      },
      {
        id: 'fresh',
        topic: 'Fresh topic',
        status: 'generated',
        scheduledAt: new Date('2026-06-06T09:00:00.000Z'),
        lineNotifiedAt: null,
        updatedAt: new Date('2026-06-06T09:00:00.000Z'),
        createdAt: new Date('2026-06-06T09:00:00.000Z'),
        articleId: 'article-2',
      },
      {
        id: 'approved',
        topic: 'Approved topic',
        status: 'approved',
        scheduledAt: new Date('2026-06-05T08:00:00.000Z'),
        lineNotifiedAt: new Date('2026-06-05T08:00:00.000Z'),
        updatedAt: new Date('2026-06-05T08:00:00.000Z'),
        createdAt: new Date('2026-06-05T08:00:00.000Z'),
        articleId: 'article-3',
      },
    ], 12, now)

    expect(breaches).toHaveLength(1)
    expect(breaches[0]).toMatchObject({ id: 'late', status: 'notified', ageHours: 26 })
  })

  it('round-trips alerted keys', () => {
    const keys = new Set(['a:notified', approvalSlaAlertKey({ id: 'b', status: 'generated' })])
    expect(parseApprovalSlaAlertedKeys(serializeApprovalSlaAlertedKeys(keys))).toEqual(keys)
    expect(parseApprovalSlaAlertedKeys('a:notified,b:generated')).toEqual(keys)
  })

  it('formats a concise LINE alert', () => {
    const message = formatApprovalSlaLineMessage([
      {
        id: 'late',
        topic: 'Late topic',
        status: 'notified',
        ageHours: 26.4,
        waitingSince: new Date('2026-06-05T08:00:00.000Z'),
        scheduledAt: new Date('2026-06-06T08:00:00.000Z'),
        articleId: 'article-1',
      },
    ], 24)

    expect(message).toContain('Approval SLA Alert')
    expect(message).toContain('Late topic')
    expect(message).toContain('เกิน 24 ชั่วโมง')
  })
})
