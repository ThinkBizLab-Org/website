# AWS IAM setup for Remotion Lambda

Remotion generates the exact, version-matched IAM policies for you — don't paste
a hand-written one (it drifts between Remotion versions). Run these from
`remotion/` after `npm install`.

## 1. Create the deploy/runtime user

Create an IAM user (e.g. `remotion-deploy`) with **programmatic access**, then
attach the policy Remotion prints:

```bash
# Print the user policy JSON, paste it into a new IAM policy, attach to the user
npx remotion lambda policies user
```

Use that user's access key / secret as `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` (both for `deploy.mjs` and the app runtime invoker).

## 2. Create the Lambda execution role

```bash
# Print the role policy; create role "remotion-lambda-role" with it
npx remotion lambda policies role
```

## 3. Validate

```bash
npx remotion lambda policies validate
```

## 4. Deploy

```bash
REMOTION_AWS_REGION=us-east-1 node deploy.mjs
```

Copy the printed `REMOTION_FUNCTION_NAME` / `REMOTION_SERVE_URL` / region into
the main app's environment (Vercel). Then verify readiness at
`GET /api/video-pipeline` (the `readiness` block lists anything still missing)
before flipping `video_pipeline.enabled`.

Docs: https://www.remotion.dev/docs/lambda/setup
