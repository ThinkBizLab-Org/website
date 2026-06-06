// Pluggable Thai text-to-speech for video voiceover. Implemented with plain
// fetch against provider REST APIs so no heavy SDKs are added to the build.
// The active provider is chosen by the video_pipeline config; credentials come
// from settings/env. Used only by the Remotion path when voiceover is on.

import { getSetting } from './settings-store'
import type { TtsProvider } from './video-pipeline-config'

export type TtsResult = { buffer: Buffer; contentType: string }

async function settingOrEnv(key: string, envKey: string): Promise<string> {
  try {
    const value = await getSetting(key)
    if (value) return value
  } catch {
    // optional setting — fall through to env
  }
  return process.env[envKey] ?? ''
}

export async function synthesizeVoiceover(text: string, provider: TtsProvider): Promise<TtsResult> {
  const script = text.trim()
  if (!script) throw new Error('TTS script is empty')
  if (provider === 'elevenlabs') return synthesizeElevenLabs(script)
  if (provider === 'google') return synthesizeGoogle(script)
  throw new Error('No TTS provider configured (set video_pipeline.ttsProvider)')
}

async function synthesizeElevenLabs(text: string): Promise<TtsResult> {
  const apiKey = await settingOrEnv('elevenlabs_api_key', 'ELEVENLABS_API_KEY')
  const voiceId = await settingOrEnv('elevenlabs_voice_id', 'ELEVENLABS_VOICE_ID')
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured')
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID not configured')

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs TTS error ${res.status}: ${await res.text()}`)
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' }
}

async function synthesizeGoogle(text: string): Promise<TtsResult> {
  const apiKey = await settingOrEnv('google_tts_api_key', 'GOOGLE_TTS_API_KEY')
  const voiceName = (await settingOrEnv('google_tts_voice', 'GOOGLE_TTS_VOICE')) || 'th-TH-Standard-A'
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not configured')

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'th-TH', name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  })
  if (!res.ok) throw new Error(`Google TTS error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { audioContent?: string }
  if (!data.audioContent) throw new Error('Google TTS returned no audio')
  return { buffer: Buffer.from(data.audioContent, 'base64'), contentType: 'audio/mpeg' }
}
