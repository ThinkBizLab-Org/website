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

  const webhook = process.env.ERROR_WEBHOOK_URL
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
