// Thin client for the Remotion Lambda renderer.
//
// The Remotion composition lives in the separate `remotion/` project and is
// deployed to AWS Lambda + an S3 site (see remotion/README.md). This module
// submits a render and polls its progress, mirroring the submit→poll pattern
// the media queue already uses for HeyGen.
//
// `@remotion/lambda` is an optional, runtime-only dependency: it is loaded via
// a dynamic import with a non-literal specifier so the main app type-checks and
// builds without it installed. It is only required once the pipeline is enabled
// (engine = remotion) and a render actually fires.

import type { RemotionInputProps } from './video-pipeline'

export type RemotionRenderSubmit = { renderId: string; bucketName: string }
export type RemotionRenderStatus =
  | { status: 'processing'; progress: number }
  | { status: 'done'; outputUrl: string }
  | { status: 'error'; error: string }

type RemotionEnv = {
  region: string
  functionName: string
  serveUrl: string
  composition: string
}

function remotionEnv(): RemotionEnv {
  const region = process.env.REMOTION_AWS_REGION ?? ''
  const functionName = process.env.REMOTION_FUNCTION_NAME ?? ''
  const serveUrl = process.env.REMOTION_SERVE_URL ?? ''
  const composition = process.env.REMOTION_COMPOSITION_ID ?? 'ShortVideo'
  if (!region || !functionName || !serveUrl) {
    throw new Error('Remotion Lambda not configured (REMOTION_AWS_REGION / REMOTION_FUNCTION_NAME / REMOTION_SERVE_URL)')
  }
  return { region, functionName, serveUrl, composition }
}

// Dynamic, non-literal import keeps tsc/next build green when the optional
// package is not installed. Throws a clear, actionable error if it is missing.
async function loadLambdaClient(): Promise<any> {
  const specifier = '@remotion/lambda/client'
  try {
    return await import(specifier)
  } catch {
    throw new Error('@remotion/lambda is not installed — run `npm install @remotion/lambda` to enable the Remotion video pipeline')
  }
}

export async function submitRemotionRender(inputProps: RemotionInputProps): Promise<RemotionRenderSubmit> {
  const env = remotionEnv()
  const client = await loadLambdaClient()
  const { renderMediaOnLambda } = client
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: env.region,
    functionName: env.functionName,
    serveUrl: env.serveUrl,
    composition: env.composition,
    inputProps,
    codec: 'h264',
    privacy: 'public',
    downloadBehavior: { type: 'play-in-browser' },
  })
  return { renderId, bucketName }
}

export async function pollRemotionRender(renderId: string, bucketName: string): Promise<RemotionRenderStatus> {
  const env = remotionEnv()
  const client = await loadLambdaClient()
  const { getRenderProgress } = client
  const progress = await getRenderProgress({
    renderId,
    bucketName,
    functionName: env.functionName,
    region: env.region,
  })
  if (progress.fatalErrorEncountered) {
    return { status: 'error', error: progress.errors?.[0]?.message ?? 'Remotion render failed' }
  }
  if (progress.done) {
    return { status: 'done', outputUrl: progress.outputFile as string }
  }
  return { status: 'processing', progress: Number(progress.overallProgress ?? 0) }
}
