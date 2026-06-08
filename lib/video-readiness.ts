import { getSetting } from './settings-store'
import { loadVideoPipelineConfig, type VideoPipelineConfig } from './video-pipeline-config'

// Preflight for the Remotion video pipeline: reports which env/config/secret
// pieces are still missing before it can render. Surfaced by /api/video-pipeline
// so an admin can verify after provisioning AWS / TTS, without enabling the flag
// blind.

export type ReadinessCheck = { key: string; ok: boolean; hint?: string }
export type VideoReadiness = {
  ready: boolean
  enabled: boolean
  engine: string
  ttsProvider: string
  missing: string[]
  checklist: ReadinessCheck[]
}

const env = (key: string) => Boolean(process.env[key])

async function settingPresent(key: string): Promise<boolean> {
  try {
    return Boolean(await getSetting(key))
  } catch {
    return false
  }
}

// Literal specifier (not a variable) so the bundler/file-tracer includes the
// package in this route's serverless function. A non-literal import() is not
// traced, so the module would always appear "missing" at runtime even when it
// is installed — this mirrors the literal import used by lib/remotion-render.ts.
async function lambdaClientInstalled(): Promise<boolean> {
  try {
    await import('@remotion/lambda-client')
    return true
  } catch {
    return false
  }
}

export async function getVideoPipelineReadiness(config?: VideoPipelineConfig): Promise<VideoReadiness> {
  const cfg = config ?? await loadVideoPipelineConfig()
  const checks: ReadinessCheck[] = []

  if (cfg.engine === 'remotion') {
    checks.push({ key: 'REMOTION_AWS_REGION', ok: env('REMOTION_AWS_REGION'), hint: 'from remotion/deploy.mjs output' })
    checks.push({ key: 'REMOTION_FUNCTION_NAME', ok: env('REMOTION_FUNCTION_NAME'), hint: 'from remotion/deploy.mjs output' })
    checks.push({ key: 'REMOTION_SERVE_URL', ok: env('REMOTION_SERVE_URL'), hint: 'from remotion/deploy.mjs output' })
    checks.push({ key: 'AWS credentials', ok: env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY'), hint: 'IAM user for invoking the render Lambda' })
    checks.push({ key: '@remotion/lambda-client installed', ok: await lambdaClientInstalled(), hint: 'npm install @remotion/lambda-client' })
  }

  // flux still backgrounds use fal.ai (also B-roll when enabled)
  checks.push({ key: 'fal_api_key', ok: (await settingPresent('fal_api_key')) || env('FAL_KEY'), hint: 'Admin → Settings → fal.ai' })

  if (cfg.ttsProvider === 'elevenlabs') {
    checks.push({ key: 'elevenlabs_api_key', ok: await settingPresent('elevenlabs_api_key'), hint: 'Admin → Settings → ElevenLabs' })
    checks.push({ key: 'elevenlabs_voice_id', ok: await settingPresent('elevenlabs_voice_id'), hint: 'Admin → Settings → ElevenLabs' })
  } else if (cfg.ttsProvider === 'google') {
    checks.push({ key: 'google_tts_api_key', ok: (await settingPresent('google_tts_api_key')) || env('GOOGLE_TTS_API_KEY') })
  }

  const missing = checks.filter(check => !check.ok).map(check => check.key)
  return {
    ready: missing.length === 0,
    enabled: cfg.enabled,
    engine: cfg.engine,
    ttsProvider: cfg.ttsProvider,
    missing,
    checklist: checks,
  }
}
