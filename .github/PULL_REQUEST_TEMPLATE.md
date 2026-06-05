## Summary

- 

## Migrations

- [ ] Run `npm run migrations:run` to preview pending SQL files.
- [ ] Run `npm run migrations:run -- --write` against preview DB.
- [ ] Verify `/admin/system` shows expected tables present.
- [ ] Run production migrations only after PR review approval.

## Checks

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`

## Smoke Test

- [ ] Admin login works.
- [ ] Article create/edit/publish workflow works.
- [ ] Media upload uses R2 URLs.
- [ ] Newsletter subscribe, confirm, and unsubscribe flows work.
- [ ] Link checker scan works.
- [ ] Monitoring test event works.
- [ ] Backup job writes to R2 and appears in `/admin/system`.

## Deployment

- [ ] Deploy only through PR merge flow.
- [ ] Confirm preview deployment before production.
- [ ] Apply production migrations before production traffic uses new features.
