## Summary

- 

## Deployment Flow

- [ ] This change follows `dev -> Preview -> Production`.
- [ ] Preview deployment is reviewed at `https://test.thinkbizlab.com`.
- [ ] Deployment is opened through PR, not direct local deploy.

## Migrations

- [ ] Run `npm run migrations:run` to preview pending SQL files.
- [ ] Run `npm run migrations:run -- --write` against Preview DB.
- [ ] Verify `https://test.thinkbizlab.com/admin/system` shows expected tables present.
- [ ] Run Production migrations only after PR review approval.

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

- [ ] Deploy Preview through PR flow.
- [ ] Confirm Preview deployment before Production.
- [ ] Apply Production migrations before Production traffic uses new features.
