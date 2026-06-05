# Production Rollout Plan

Deployment must happen through PR flow only.

The deployment flow is:

```txt
dev -> Preview -> Production
```

Preview URL:

```txt
https://test.thinkbizlab.com
```

## Sequence

1. Work from `dev` or a feature branch.
2. Open a PR for Preview.
3. Wait for GitHub checks.
4. Apply Preview DB migrations.
5. Verify `https://test.thinkbizlab.com`.
6. Run Preview smoke tests.
7. Open/approve the PR path to Production.
8. Apply Production DB migrations.
9. Merge PR for Production.
10. Verify Production deployment.
11. Run Production smoke tests.

## Environment Checks

Required:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `ENCRYPTION_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

Recommended:

- `CRON_SECRET`
- `ERROR_WEBHOOK_URL` or `error_webhook_url` setting

## Migrations

Run:

```bash
npm run migrations:run
npm run migrations:run -- --write
```

Then confirm `/admin/system` reports all expected tables as present.

## Rollback

1. Disable cron routes by rotating or removing `CRON_SECRET`.
2. Revert the PR.
3. Leave new SQL tables in place unless data deletion is explicitly approved.
4. Investigate using `/admin/monitoring`, `/admin/audit`, and Vercel logs.
