import { desc } from 'drizzle-orm'
import { db } from './db'
import { notificationLog } from './schema'
import { getSetting, getSettings, setSetting } from './settings-store'
import { errorMessage } from './monitoring'

export const NOTIFICATION_EVENTS = ['dead_letter', 'ready_for_approval', 'published', 'budget_paused', 'ops_digest'] as const
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

export const NOTIFICATION_CHANNELS = ['line', 'slack', 'email'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export type NotificationRouting = Record<NotificationEvent, NotificationChannel[]>

// LINE for approval/published is already handled by the existing content factory
// and publish flows, so those events default to slack + email here to avoid
// duplicate LINE messages. Dead letter (a failed queue) fans out to everything.
export const DEFAULT_NOTIFICATION_ROUTING: NotificationRouting = {
  dead_letter: ['line', 'slack', 'email'],
  ready_for_approval: ['slack', 'email'],
  published: ['slack', 'email'],
  budget_paused: ['line', 'slack', 'email'],
  ops_digest: ['slack', 'email'],
}

export const NOTIFICATION_ROUTING_SETTING = 'notification_routing'

export function normalizeNotificationEvent(value: unknown): NotificationEvent | null {
  return NOTIFICATION_EVENTS.includes(value as NotificationEvent) ? (value as NotificationEvent) : null
}

export function normalizeNotificationChannel(value: unknown): NotificationChannel | null {
  return NOTIFICATION_CHANNELS.includes(value as NotificationChannel) ? (value as NotificationChannel) : null
}

// Parses persisted routing config, dropping unknown events/channels and falling
// back to defaults for anything not explicitly configured.
export function parseRouting(raw: unknown): NotificationRouting {
  let source: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw) as Record<string, unknown>
    } catch {
      source = {}
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>
  }

  const routing = {} as NotificationRouting
  for (const event of NOTIFICATION_EVENTS) {
    const configured = source[event]
    if (Array.isArray(configured)) {
      const channels = configured
        .map(normalizeNotificationChannel)
        .filter((channel): channel is NotificationChannel => channel !== null)
      routing[event] = Array.from(new Set(channels))
    } else {
      routing[event] = [...DEFAULT_NOTIFICATION_ROUTING[event]]
    }
  }
  return routing
}

export function resolveChannelsForEvent(routing: NotificationRouting, event: NotificationEvent): NotificationChannel[] {
  return routing[event] ?? []
}

export function formatNotification(event: NotificationEvent, payload: { title?: string; message: string }): { title: string; message: string } {
  const labels: Record<NotificationEvent, string> = {
    dead_letter: '🚨 Dead letter: a job exhausted its retries',
    ready_for_approval: '📝 Content ready for approval',
    published: '✅ Article published',
    budget_paused: '💸 AI budget exceeded — Content Factory paused',
    ops_digest: '📊 Weekly ops digest',
  }
  return { title: payload.title?.trim() || labels[event], message: payload.message }
}

export type DispatchInput = {
  event: NotificationEvent
  title?: string
  message: string
  context?: Record<string, unknown>
}

export type DispatchChannelResult = { channel: NotificationChannel; status: 'sent' | 'failed' | 'skipped'; error?: string }

// Fans an event out to every routed channel. Notifications are best-effort: a
// channel failure is logged but never thrown, so the calling flow (queues,
// publish, content factory) is never broken by a notification problem.
export async function dispatchNotification(input: DispatchInput): Promise<{ event: NotificationEvent; results: DispatchChannelResult[] }> {
  const routing = await loadRouting()
  const channels = resolveChannelsForEvent(routing, input.event)
  const { title, message } = formatNotification(input.event, input)

  const results: DispatchChannelResult[] = []
  for (const channel of channels) {
    let result: DispatchChannelResult
    try {
      result = await sendToChannel(channel, title, message)
    } catch (error) {
      result = { channel, status: 'failed', error: errorMessage(error) }
    }
    results.push(result)
    await recordNotification(input.event, result, title, message, input.context)
  }

  return { event: input.event, results }
}

export async function loadRouting(): Promise<NotificationRouting> {
  try {
    const raw = await getSetting(NOTIFICATION_ROUTING_SETTING)
    return parseRouting(raw)
  } catch {
    return parseRouting(null)
  }
}

export async function saveRouting(routing: NotificationRouting): Promise<NotificationRouting> {
  const normalized = parseRouting(routing)
  await setSetting(NOTIFICATION_ROUTING_SETTING, JSON.stringify(normalized))
  return normalized
}

export async function listNotifications(limit = 200) {
  return db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)).limit(Math.max(1, Math.min(limit, 500)))
}

async function recordNotification(event: NotificationEvent, result: DispatchChannelResult, title: string, message: string, context?: Record<string, unknown>) {
  try {
    await db.insert(notificationLog).values({
      event,
      channel: result.channel,
      status: result.status,
      title,
      message,
      error: result.error ?? null,
      context: context ?? {},
    })
  } catch {
    // Notification log is best-effort; DB may be unavailable before migrations run.
  }
}

async function sendToChannel(channel: NotificationChannel, title: string, message: string): Promise<DispatchChannelResult> {
  if (channel === 'line') return sendLine(channel, title, message)
  if (channel === 'slack') return sendSlack(channel, title, message)
  return sendEmail(channel, title, message)
}

async function sendLine(channel: NotificationChannel, title: string, message: string): Promise<DispatchChannelResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return { channel, status: 'skipped', error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ type: 'text', text: `${title}\n\n${message}` }] }),
  })
  if (!res.ok) return { channel, status: 'failed', error: `LINE ${res.status}` }
  return { channel, status: 'sent' }
}

async function sendSlack(channel: NotificationChannel, title: string, message: string): Promise<DispatchChannelResult> {
  const url = (await getSetting('slack_webhook_url')) || process.env.SLACK_WEBHOOK_URL || ''
  if (!url) return { channel, status: 'skipped', error: 'slack_webhook_url not set' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `*${title}*\n${message}` }),
  })
  if (!res.ok) return { channel, status: 'failed', error: `Slack ${res.status}` }
  return { channel, status: 'sent' }
}

async function sendEmail(channel: NotificationChannel, title: string, message: string): Promise<DispatchChannelResult> {
  const map = await getSettings(['resend_api_key', 'notify_email_from', 'notify_email_to'])
  const apiKey = map.resend_api_key || process.env.RESEND_API_KEY || ''
  const from = map.notify_email_from || process.env.NOTIFY_EMAIL_FROM || ''
  const to = map.notify_email_to || process.env.NOTIFY_EMAIL_TO || ''
  if (!apiKey || !from || !to) return { channel, status: 'skipped', error: 'resend_api_key/notify_email_from/notify_email_to not set' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to: to.split(',').map(value => value.trim()).filter(Boolean),
      subject: title,
      text: message,
    }),
  })
  if (!res.ok) return { channel, status: 'failed', error: `Resend ${res.status}` }
  return { channel, status: 'sent' }
}
