# ThinkBiz Remotion — hybrid short-video renderer

9:16 (1080×1920) Reels/TikTok compositions for the Content Factory video
pipeline. This is a **separate package** from the Next.js app (its own
`package.json`/`tsconfig`) and is excluded from the root TypeScript build — it
runs on AWS Lambda, not on Vercel.

## How it fits

```
content-factory → media_production_queue(short_video)
   → media-production-processor → video-router (resolve plan + route scenes)
   → ASSETS  flux still / fal-video B-roll / TTS voiceover  → R2
   → RENDER  submitRemotionRender → THIS Lambda → poll
   → FINALIZE download mp4 → R2 → article.ttVideoUrl / igVideoUrl
```

The composition `ShortVideo` accepts `RemotionInputProps` (see `src/types.ts`),
which mirrors `RemotionInputProps` in the app's `lib/video-pipeline.ts`. Keep
the two type definitions in sync.

## Local preview

```bash
cd remotion
npm install
npm run studio
```

## Deploy to AWS Lambda

1. Create AWS IAM user/role with the Remotion Lambda policy:
   https://www.remotion.dev/docs/lambda/setup
2. Export AWS credentials + region, then:

```bash
cd remotion
npm install
REMOTION_AWS_REGION=us-east-1 node deploy.mjs
```

3. Copy the printed values into the **main app** environment (Vercel):

| Env var | Example |
| --- | --- |
| `REMOTION_AWS_REGION` | `us-east-1` |
| `REMOTION_FUNCTION_NAME` | `remotion-render-4-0-x-mem2048mb-...` |
| `REMOTION_SERVE_URL` | `https://remotionlambda-....s3.../sites/thinkbiz-shortvideo/index.html` |
| `REMOTION_COMPOSITION_ID` | `ShortVideo` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | runtime invoker creds |

4. In the main app, install the runtime client and enable the pipeline:

```bash
npm install @remotion/lambda   # required only when engine = remotion
```

Then set the `video_pipeline` setting `{ "enabled": true, "engine": "remotion", "ttsProvider": "elevenlabs" }`.

## Licensing

Remotion requires a company license for teams above its free-tier threshold.
Review https://www.remotion.dev/license before production use.
