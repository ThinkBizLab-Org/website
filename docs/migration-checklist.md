# Migration Checklist

Use this checklist before merging or deploying CMS production features.

Deployment flow:

```txt
dev -> Preview (https://test.thinkbizlab.com) -> Production
```

Every Preview and Production deploy must be opened and reviewed through a PR.

## Preview

1. Confirm the branch is current with `dev` or the approved feature branch.
2. Confirm Preview `DATABASE_URL` points to Neon Singapore (`aws-ap-southeast-1`).
3. Run `npm run migrations:run` and review pending migrations.
4. Run `npm run migrations:run -- --write` against the Preview database.
5. Open `https://test.thinkbizlab.com/admin/system` and confirm all expected tables are present.
6. Run the smoke test checklist in `docs/smoke-test-checklist.md`.

## Production

1. Confirm the PR has passed GitHub checks.
2. Confirm Preview smoke tests passed on `https://test.thinkbizlab.com`.
3. Confirm Production `DATABASE_URL` points to Neon Singapore (`aws-ap-southeast-1`).
4. Run `npm run migrations:run` against the Production database.
5. Run `npm run migrations:run -- --write` against the Production database.
6. Merge through PR flow only.
7. Open `/admin/system` and confirm Production table status.
8. Run post-deploy smoke tests.

## Expected New Tables

- `article_revisions`
- `article_page_views`
- `social_post_queue`
- `link_check_results`
- `operational_events`
- `backup_jobs`

## Notes

- `subscribers` receives new columns for double opt-in and segments.
- `articles.status` now supports `approved`.
- Rollbacks should be handled manually because the new tables may contain production audit, analytics, subscriber, or backup data.
