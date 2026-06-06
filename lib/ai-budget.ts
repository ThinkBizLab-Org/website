import { getSetting, setSetting } from './settings-store'
import { getRecentUsage, summarizeUsage } from './ai-usage'
import { dispatchNotification } from './notifications'

// A monthly USD spend cap for AI usage. When auto-pause is on and the current
// month's estimated cost crosses the cap, the Content Factory is disabled and an
// alert is fired — so runaway generation can't quietly burn budget.

export const AI_BUDGET_SETTING = 'ai_budget'
export const CONTENT_FACTORY_ENABLED_SETTING = 'content_factory_enabled'
const BUDGET_PAUSED_FLAG = 'ai_budget_paused_month'
const WARN_RATIO = 0.8

export type AiBudgetConfig = {
  monthlyUsd: number
  autoPause: boolean
}

export const DEFAULT_AI_BUDGET: AiBudgetConfig = { monthlyUsd: 0, autoPause: false }

export function parseAiBudget(raw: unknown): AiBudgetConfig {
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
  const monthly = Number(source.monthlyUsd)
  return {
    monthlyUsd: Number.isFinite(monthly) && monthly > 0 ? monthly : 0,
    autoPause: source.autoPause === true || source.autoPause === 'true',
  }
}

export type BudgetStatus = {
  capUsd: number
  spentUsd: number
  ratio: number
  exceeded: boolean
  warn: boolean
  enabled: boolean
}

// Pure: given the month's spend and the cap, classify budget health.
export function evaluateBudget(spentUsd: number, config: AiBudgetConfig): BudgetStatus {
  const capUsd = config.monthlyUsd
  const enabled = capUsd > 0
  const ratio = enabled ? spentUsd / capUsd : 0
  return {
    capUsd,
    spentUsd,
    ratio,
    exceeded: enabled && spentUsd >= capUsd,
    warn: enabled && ratio >= WARN_RATIO && spentUsd < capUsd,
    enabled,
  }
}

export function currentMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export async function loadAiBudget(): Promise<AiBudgetConfig> {
  try {
    return parseAiBudget(await getSetting(AI_BUDGET_SETTING))
  } catch {
    return { ...DEFAULT_AI_BUDGET }
  }
}

export async function saveAiBudget(config: AiBudgetConfig): Promise<AiBudgetConfig> {
  const normalized = parseAiBudget(config)
  await setSetting(AI_BUDGET_SETTING, JSON.stringify(normalized))
  return normalized
}

async function currentMonthSpend(): Promise<number> {
  const rows = await getRecentUsage(40)
  const month = currentMonthKey()
  const summary = summarizeUsage(rows.map(row => ({
    kind: row.kind,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    status: row.status,
    createdAt: row.createdAt,
  })))
  return summary.monthly.find(bucket => bucket.key === month)?.costUsd ?? 0
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const [config, spent] = await Promise.all([loadAiBudget(), currentMonthSpend()])
  return evaluateBudget(spent, config)
}

// Enforces the budget: if exceeded with auto-pause on, disables the Content
// Factory and alerts once per month (guarded by a paused-month flag so it does
// not re-pause/re-notify every run). Returns whether it paused this call.
export async function enforceAiBudget(): Promise<{ paused: boolean; status: BudgetStatus }> {
  const config = await loadAiBudget()
  const spent = await currentMonthSpend()
  const status = evaluateBudget(spent, config)
  if (!config.autoPause || !status.exceeded) return { paused: false, status }

  const month = currentMonthKey()
  const alreadyPaused = (await getSetting(BUDGET_PAUSED_FLAG).catch(() => null)) === month
  if (alreadyPaused) return { paused: false, status }

  await setSetting(CONTENT_FACTORY_ENABLED_SETTING, 'false')
  await setSetting(BUDGET_PAUSED_FLAG, month)
  await dispatchNotification({
    event: 'budget_paused',
    message: `AI spend for ${month} reached $${spent.toFixed(2)} of the $${config.monthlyUsd.toFixed(2)} cap. Content Factory has been paused.`,
    context: { month, spentUsd: spent, capUsd: config.monthlyUsd },
  })
  return { paused: true, status }
}
