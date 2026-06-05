'use client'

import { useEffect } from 'react'

export function ArticleViewTracker({ articleId, slug }: { articleId: string; slug: string }) {
  useEffect(() => {
    const payload = JSON.stringify({
      articleId,
      slug,
      path: window.location.pathname,
      referrer: document.referrer,
    })

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics/page-view', blob)
      return
    }

    fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined)
  }, [articleId, slug])

  return null
}
