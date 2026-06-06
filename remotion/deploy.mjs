// Deploys the Remotion Lambda function + bundled site, then prints the env
// values the main app needs. Requires AWS credentials with the Remotion Lambda
// IAM policy (see https://www.remotion.dev/docs/lambda/setup).
//
//   cd remotion && npm install && node deploy.mjs
//
// Then set in the main app (Vercel) env:
//   REMOTION_AWS_REGION, REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL,
//   REMOTION_COMPOSITION_ID=ShortVideo
// and AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY for the runtime invoker.

import { deployFunction, deploySite, getOrCreateBucket } from '@remotion/lambda'
import path from 'node:path'

const region = process.env.REMOTION_AWS_REGION ?? 'us-east-1'

const { functionName } = await deployFunction({
  region,
  timeoutInSeconds: 240,
  memorySizeInMb: 2048,
  createCloudWatchLogGroup: true,
})

const { bucketName } = await getOrCreateBucket({ region })

const { serveUrl } = await deploySite({
  region,
  bucketName,
  entryPoint: path.resolve('src/index.ts'),
  siteName: 'thinkbiz-shortvideo',
})

console.log(JSON.stringify({ region, functionName, serveUrl, composition: 'ShortVideo' }, null, 2))
