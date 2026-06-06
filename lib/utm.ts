// UTM campaign builder. Pure and dependency-free so the admin panel can build
// links client-side and the same helpers can run on the server.

export const UTM_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'line'] as const
export type UtmPlatform = (typeof UTM_PLATFORMS)[number]

export type UtmConfig = {
  baseUrl: string
  medium: string
  campaignDefault: string
  source: Record<UtmPlatform, string>
}

export const UTM_CONFIG_SETTING = 'utm_config'

export const DEFAULT_UTM_CONFIG: UtmConfig = {
  baseUrl: 'https://www.thinkbizlab.com',
  medium: 'social',
  campaignDefault: '',
  source: { facebook: 'facebook', instagram: 'instagram', tiktok: 'tiktok', line: 'line' },
}

export function parseUtmConfig(raw: unknown): UtmConfig {
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

  const sourceMap = (source.source && typeof source.source === 'object' ? source.source : {}) as Record<string, unknown>
  const resolvedSource = {} as Record<UtmPlatform, string>
  for (const platform of UTM_PLATFORMS) {
    resolvedSource[platform] = String(sourceMap[platform] ?? DEFAULT_UTM_CONFIG.source[platform]).trim() || DEFAULT_UTM_CONFIG.source[platform]
  }

  return {
    baseUrl: String(source.baseUrl ?? DEFAULT_UTM_CONFIG.baseUrl).trim() || DEFAULT_UTM_CONFIG.baseUrl,
    medium: String(source.medium ?? DEFAULT_UTM_CONFIG.medium).trim() || DEFAULT_UTM_CONFIG.medium,
    campaignDefault: String(source.campaignDefault ?? '').trim(),
    source: resolvedSource,
  }
}

export function slugifyCampaign(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Resolves a possibly-relative target into an absolute URL and appends the UTM
// params, preserving any query string already present.
export function buildUtmUrl(
  target: string,
  params: { source: string; medium: string; campaign: string; content?: string },
  baseUrl = DEFAULT_UTM_CONFIG.baseUrl,
): string {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    const base = baseUrl.replace(/\/+$/, '')
    const path = target.startsWith('/') ? target : `/${target}`
    url = new URL(`${base}${path}`)
  }

  if (params.source) url.searchParams.set('utm_source', params.source)
  if (params.medium) url.searchParams.set('utm_medium', params.medium)
  if (params.campaign) url.searchParams.set('utm_campaign', params.campaign)
  if (params.content) url.searchParams.set('utm_content', params.content)
  return url.toString()
}

export function buildPlatformUrls(
  target: string,
  campaign: string,
  config: UtmConfig,
): { platform: UtmPlatform; url: string }[] {
  const resolvedCampaign = slugifyCampaign(campaign || config.campaignDefault)
  return UTM_PLATFORMS.map(platform => ({
    platform,
    url: buildUtmUrl(target, { source: config.source[platform], medium: config.medium, campaign: resolvedCampaign }, config.baseUrl),
  }))
}
