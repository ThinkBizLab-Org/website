import { getSetting, setSetting } from './settings-store'

// Auto-approval gate for Content Factory drafts: when quality and fact-check are
// strong enough, a draft is approved + scheduled automatically instead of waiting
// for manual LINE approval. Opt-in.

export const AUTO_APPROVE_SETTING = 'auto_approve'

export type AutoApproveConfig = {
  enabled: boolean
  minQualityScore: number
  maxUnsupported: number
  requireFactCheck: boolean
}

export const DEFAULT_AUTO_APPROVE: AutoApproveConfig = {
  enabled: false,
  minQualityScore: 85,
  maxUnsupported: 0,
  requireFactCheck: true,
}

export function parseAutoApproveConfig(raw: unknown): AutoApproveConfig {
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
  const num = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback
  }
  return {
    enabled: source.enabled === true || source.enabled === 'true',
    minQualityScore: num(source.minQualityScore, DEFAULT_AUTO_APPROVE.minQualityScore, 0, 100),
    maxUnsupported: num(source.maxUnsupported, DEFAULT_AUTO_APPROVE.maxUnsupported, 0, 100),
    requireFactCheck: source.requireFactCheck === undefined ? DEFAULT_AUTO_APPROVE.requireFactCheck : source.requireFactCheck === true || source.requireFactCheck === 'true',
  }
}

export type AutoApproveSignals = {
  qualityScore: number
  qualityPassed: boolean
  factCheck: { summary: { unsupported: number } } | null
}

// Pure: decide whether a draft clears the gate. A failed/absent fact-check blocks
// auto-approval when requireFactCheck is on (the safe default).
export function shouldAutoApprove(signals: AutoApproveSignals, config: AutoApproveConfig): boolean {
  if (!config.enabled) return false
  if (!signals.qualityPassed) return false
  if (signals.qualityScore < config.minQualityScore) return false
  if (!signals.factCheck) return !config.requireFactCheck
  return signals.factCheck.summary.unsupported <= config.maxUnsupported
}

export async function loadAutoApproveConfig(): Promise<AutoApproveConfig> {
  try {
    return parseAutoApproveConfig(await getSetting(AUTO_APPROVE_SETTING))
  } catch {
    return { ...DEFAULT_AUTO_APPROVE }
  }
}

export async function saveAutoApproveConfig(config: AutoApproveConfig): Promise<AutoApproveConfig> {
  const normalized = parseAutoApproveConfig(config)
  await setSetting(AUTO_APPROVE_SETTING, JSON.stringify(normalized))
  return normalized
}
