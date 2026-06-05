# Migration Checklist

Use this checklist before merging or deploying CMS production features.

## Preview

1. Confirm the branch is current with `main`.
2. Run `npm run migrations:run` and review pending migrations.
3. Run `npm run migrations:run -- --write` against the preview database.
4. Open `/admin/system` and confirm all expected tables are present.
5. Run the smoke test checklist in `docs/smoke-test-checklist.md`.

## Production

1. Confirm the PR has passed GitHub checks.
2. Confirm preview smoke tests passed.
3. Run `npm run migrations:run` against the production database.
4. Run `npm run migrations:run -- --write` against the production database.
5. Merge through PR flow only.
6. Open `/admin/system` and confirm production table status.
7. Run post-deploy smoke tests.

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
