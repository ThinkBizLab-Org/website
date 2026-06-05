# PR: CMS Production Features

## Summary

This PR upgrades the ThinkBiz Lab CMS toward production-grade operations across content workflow, public discovery, media operations, subscriber management, monitoring, backups, and deployment safety.

## Feature Set

- Article revision history and restore.
- Article approval workflow with `draft`, `review`, `approved`, and `published` status.
- SEO/GEO editor checklist.
- Media usage tracking and orphan filtering.
- Subscriber admin dashboard and CSV export.
- First-party article analytics dashboard.
- Social post queue controls.
- Public RSS and JSON feeds.
- Article search autocomplete.
- Public tag, topic, and author pages.
- Article bulk actions, duplicate article, and editor autosave.
- Broken link checker with admin dashboard.
- Newsletter double opt-in, unsubscribe tokens, and segments.
- AI editor helpers for SEO/GEO, FAQ, and social copy.
- Error monitoring dashboard with browser error capture and webhook support.
- Backup scheduler to R2 and system status page.
- CI checks for PR validation.

## Migrations

Apply the SQL files in `scripts/sql` in filename order:

- `001_p1_observability.sql`
- `002_p0_rbac_ops.sql`
- `003_article_revisions.sql`
- `004_article_analytics.sql`
- `005_social_post_queue.sql`
- `006_link_checker.sql`
- `007_newsletter_double_opt_in.sql`
- `008_operational_events.sql`
- `009_backup_jobs.sql`

Use:

```bash
npm run migrations:run
npm run migrations:run -- --write
```

## Verification Performed Locally

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

`next build` passes. It may print the existing SWC lockfile patch warning when the environment cannot reach `registry.npmjs.org`; the command exits successfully.

## Deployment Notes

- Deployment must happen through PR flow only.
- Deployment path is `dev -> Preview -> Production`.
- Preview URL is `https://test.thinkbizlab.com`.
- Apply Preview DB migrations before validating the Preview deployment.
- Apply Production DB migrations before merging to Production or before Production code paths use new tables.
- Verify R2 env vars before testing media and backups.
- Verify `CRON_SECRET` is configured before enabling scheduled publish/backup routes.

## Rollback Notes

- Revert the PR to remove app code.
- Keep SQL rollback manual because tables may contain production content, subscribers, analytics, revisions, and backups.
- Disable cron routes by removing/rotating `CRON_SECRET` or setting `cron_enabled=false` while investigating.
