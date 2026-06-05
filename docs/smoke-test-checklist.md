# Smoke Test Checklist

Run this after Preview migrations, after Preview deploy, and after Production deploy.

Preview URL:

```txt
https://test.thinkbizlab.com
```

## Admin Access

- [ ] Login redirects to `/admin`.
- [ ] Admin sidebar loads without errors.
- [ ] `/admin/users` shows expected roles.

## Articles

- [ ] Create a draft article.
- [ ] Autosave appears after editing, then can restore.
- [ ] Duplicate an article from `/admin/articles`.
- [ ] Bulk select articles and move them to `review`.
- [ ] Approve an article.
- [ ] Publish an article.
- [ ] Revision history loads and restore works.

## Public Content

- [ ] `/articles` search autocomplete returns suggestions.
- [ ] `/tags/{tag}` loads matching articles.
- [ ] `/topics/{slug}` loads topic page.
- [ ] `/authors/thinkbiz-lab` loads author listing.
- [ ] `/rss.xml` returns XML.
- [ ] `/feed.json` returns JSON.

## Media And R2

- [ ] Upload cover image.
- [ ] Uploaded URL uses R2 public base URL.
- [ ] `/admin/media` shows usage count.
- [ ] Orphan filter works.

## Newsletter

- [ ] Subscribe with a new email.
- [ ] Status is `pending`.
- [ ] Confirm URL changes status to `active`.
- [ ] Unsubscribe URL changes status to `unsubscribed`.
- [ ] CSV export includes `segment`, `confirmed_at`, and `unsubscribed_at`.

## Operations

- [ ] `/admin/link-checker` opens.
- [ ] Run link scan.
- [ ] `/admin/monitoring` opens.
- [ ] Send monitoring test event.
- [ ] `/admin/system` opens.
- [ ] Run backup and confirm R2 key appears.
- [ ] `/api/v1/health` or `/api/health` returns healthy status for required env and DB.

## Scheduled Jobs

- [ ] Scheduled publish route is protected by `CRON_SECRET`.
- [ ] Scheduled backup route is protected by `CRON_SECRET`.
- [ ] Scheduled Content Factory route is protected by `CRON_SECRET`.
- [ ] `vercel.json` contains publish, content factory, and backup cron schedules.
- [ ] LINE admin can reply `approve CODE` and the generated article becomes `approved`.
