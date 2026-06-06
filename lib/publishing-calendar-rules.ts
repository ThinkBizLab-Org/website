export type PublishingCalendarRules = {
  weekdays: number[]
  blackoutDates: string[]
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

export function parsePublishingWeekdays(raw: string) {
  const values = raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => Number(item))
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  const unique = Array.from(new Set(values))
  return unique.length > 0 ? unique.sort((a, b) => a - b) : ALL_WEEKDAYS
}

export function parseBlackoutDates(raw: string) {
  return Array.from(new Set(raw
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item))))
    .sort()
}

export function parsePublishingCalendarRules({ weekdaysRaw, blackoutDatesRaw }: { weekdaysRaw: string; blackoutDatesRaw: string }): PublishingCalendarRules {
  return {
    weekdays: parsePublishingWeekdays(weekdaysRaw),
    blackoutDates: parseBlackoutDates(blackoutDatesRaw),
  }
}

export function isPublishDateAllowed(date: Date, rules: PublishingCalendarRules) {
  return rules.weekdays.includes(date.getDay()) && !rules.blackoutDates.includes(dateKey(date))
}

export function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
