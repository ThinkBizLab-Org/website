'use client'
import { useEffect } from 'react'

function send(payload: { name: string; message: string; context?: Record<string, unknown> }) {
  const body = JSON.stringify({
    severity: 'error',
    ...payload,
    context: {
      path: window.location.pathname,
      href: window.location.href,
      ...payload.context,
    },
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/monitoring/capture', new Blob([body], { type: 'application/json' }))
    return
  }

  fetch('/api/monitoring/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      send({
        name: 'browser.error',
        message: event.message,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error instanceof Error ? event.error.stack : undefined,
        },
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      send({
        name: 'browser.unhandled_rejection',
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
        context: { stack: event.reason instanceof Error ? event.reason.stack : undefined },
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
