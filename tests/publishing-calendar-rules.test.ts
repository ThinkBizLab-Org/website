import { describe, expect, it } from 'vitest'
import {
  dateKey,
  isPublishDateAllowed,
  parseBlackoutDates,
  parsePublishingCalendarRules,
  parsePublishingWeekdays,
} from '@/lib/publishing-calendar-rules'

describe('publishing calendar rules', () => {
  it('parses weekdays with all days as fallback', () => {
    expect(parsePublishingWeekdays('1,3,5,5,9')).toEqual([1, 3, 5])
    expect(parsePublishingWeekdays('')).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('parses blackout dates from lines or commas', () => {
    expect(parseBlackoutDates('2026-01-01\ninvalid, 2026-04-13')).toEqual(['2026-01-01', '2026-04-13'])
  })

  it('checks allowed publish dates', () => {
    const rules = parsePublishingCalendarRules({
      weekdaysRaw: '1,2,3,4,5',
      blackoutDatesRaw: '2026-06-08',
    })

    expect(isPublishDateAllowed(new Date('2026-06-09T09:00:00+07:00'), rules)).toBe(true)
    expect(isPublishDateAllowed(new Date('2026-06-07T09:00:00+07:00'), rules)).toBe(false)
    expect(isPublishDateAllowed(new Date('2026-06-08T09:00:00+07:00'), rules)).toBe(false)
  })

  it('formats local date keys', () => {
    expect(dateKey(new Date(2026, 0, 2, 9))).toBe('2026-01-02')
  })
})
