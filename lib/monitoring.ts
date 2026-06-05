import { db } from './db'
import { operationalEvents } from './schema'
import { getSetting } from './settings-store'

type MonitoringPayload = {
  name: string
  message: string
  severity?: 'info' | 'warning' | 'error'
  context?: Record<string, unknown>
}

export async function reportOperationalEvent(payload: MonitoringPayload) {
  const body = {
    service: 'thinkbiz-app',
    severity: payload.severity ?? 'error',
    name: payload.name,
    message: payload.message,
    context: payload.context ?? {},
    time: new Date().toISOString(),
  }

  console[payload.severity === 'info' ? 'log' : payload.severity === 'warning' ? 'warn' : 'error'](JSON.stringify(body))

  try {
    await db.insert(operationalEvents).values({
      service: body.service,
      severity: body.severity,
      name: body.name,
      message: body.message,
      context: body.context,
      createdAt: new Date(body.time),
    })
  } catch {
    // DB may be unavailable during build or before migrations run.
  }

  let webhook = process.env.ERROR_WEBHOOK_URL ?? ''
  try {
    webhook = webhook || (await getSetting('error_webhook_url')) || ''
  } catch {
    // Settings are optional for monitoring.
  }
  if (!webhook) return

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.error(JSON.stringify({
      service: 'thinkbiz-app',
      severity: 'error',
      name: 'monitoring.webhook_failed',
      message: String(error),
      time: new Date().toISOString(),
    }))
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
