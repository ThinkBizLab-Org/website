// Email engagement tracking helpers. Opens are tracked via a 1x1 pixel; clicks
// via a redirect wrapper. The per-subscriber unsubscribe token doubles as the
// tracking id (already a secret tied to the subscriber).

function root(base: string) {
  return base.replace(/\/+$/, '')
}

export function pixelUrl(base: string, token: string): string {
  return `${root(base)}/api/email/open?s=${encodeURIComponent(token)}`
}

export function clickUrl(base: string, token: string, target: string): string {
  return `${root(base)}/api/email/click?s=${encodeURIComponent(token)}&u=${encodeURIComponent(target)}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Pure: render a simple tracked HTML email. CTA link (if any) is click-wrapped,
// and a tracking pixel is appended. `token` may be null (no tracking — e.g. when
// the subscriber has no unsubscribe token yet).
export function renderTrackedHtml(opts: {
  paragraphs: string[]
  cta?: { label: string; url: string }
  unsubscribeUrl?: string | null
  base: string
  token: string | null
}): string {
  const { paragraphs, cta, unsubscribeUrl, base, token } = opts
  const body = paragraphs.map(p => `<p style="margin:0 0 16px;line-height:1.7;color:#1a1320">${escapeHtml(p)}</p>`).join('')

  const ctaHtml = cta
    ? `<p style="margin:24px 0"><a href="${token ? clickUrl(base, token, cta.url) : cta.url}" style="background:#7C3AED;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : ''

  const unsub = unsubscribeUrl
    ? `<p style="margin:24px 0 0;font-size:12px;color:#888">ยกเลิกการติดตาม: <a href="${escapeHtml(unsubscribeUrl)}" style="color:#888">คลิกที่นี่</a></p>`
    : ''

  const pixel = token ? `<img src="${pixelUrl(base, token)}" width="1" height="1" alt="" style="display:none" />` : ''

  return `<!doctype html><html lang="th"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f3fa;margin:0;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">${body}${ctaHtml}${unsub}</div>${pixel}</body></html>`
}

// Pure: only allow redirecting to URLs on our own origin (prevents open-redirect).
export function isSafeRedirect(target: string, siteUrl: string): boolean {
  try {
    const t = new URL(target)
    if (t.protocol !== 'http:' && t.protocol !== 'https:') return false
    return t.origin === new URL(siteUrl).origin
  } catch {
    return false
  }
}
