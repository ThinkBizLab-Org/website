import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NOTIFICATION_ROUTING,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  formatNotification,
  normalizeNotificationChannel,
  normalizeNotificationEvent,
  parseRouting,
  resolveChannelsForEvent,
} from '@/lib/notifications'

describe('notification center', () => {
  it('exposes the supported events and channels', () => {
    expect(NOTIFICATION_EVENTS).toEqual(['dead_letter', 'ready_for_approval', 'published', 'budget_paused', 'ops_digest', 'stale_content', 'lead'])
    expect(NOTIFICATION_CHANNELS).toEqual(['line', 'slack', 'email'])
  })

  it('normalizes known events and channels only', () => {
    expect(normalizeNotificationEvent('published')).toBe('published')
    expect(normalizeNotificationEvent('unknown')).toBeNull()
    expect(normalizeNotificationChannel('slack')).toBe('slack')
    expect(normalizeNotificationChannel('sms')).toBeNull()
  })

  it('falls back to defaults for unconfigured events', () => {
    const routing = parseRouting('{}')
    expect(routing).toEqual(DEFAULT_NOTIFICATION_ROUTING)
  })

  it('keeps valid channels and drops unknown ones, deduping', () => {
    const routing = parseRouting(JSON.stringify({
      dead_letter: ['slack', 'sms', 'slack', 'email'],
      published: [],
    }))
    expect(routing.dead_letter).toEqual(['slack', 'email'])
    expect(routing.published).toEqual([])
    // unconfigured event keeps its default
    expect(routing.ready_for_approval).toEqual(DEFAULT_NOTIFICATION_ROUTING.ready_for_approval)
  })

  it('tolerates malformed json by using defaults', () => {
    expect(parseRouting('not json')).toEqual(DEFAULT_NOTIFICATION_ROUTING)
    expect(parseRouting(null)).toEqual(DEFAULT_NOTIFICATION_ROUTING)
  })

  it('resolves channels for an event', () => {
    const routing = parseRouting(JSON.stringify({ dead_letter: ['line'] }))
    expect(resolveChannelsForEvent(routing, 'dead_letter')).toEqual(['line'])
  })

  it('formats a default title per event and keeps a custom title', () => {
    expect(formatNotification('published', { message: 'hi' }).title).toContain('published')
    expect(formatNotification('published', { title: 'Custom', message: 'hi' }).title).toBe('Custom')
  })
})
