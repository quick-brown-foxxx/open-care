# Manual Rollback Runbook

This runbook is for human-led rollback of Open Care staging or production after a
bad deploy, migration, or frontend release. It documents the manual path only;
there is no automated rollback workflow in this repository yet.

## Scope and guardrails

| Area                   | Staging                                                                                              | Production                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Public base URL        | `https://staging.open-care.org`                                                                      | `https://open-care.org`                                                   |
| Worker names           | `vault-ingest`, `tg-bot`, `vault-api-read`, `vault-api-write`, `vault-anchor-cron`, `vault-operator` | same names with `-production` suffix via `env.production`                 |
| Worker deploy flag     | no `--env` flag                                                                                      | `--env production`                                                        |
| D1 databases           | `vault-db`, `bot-db`                                                                                 | configured by `env.production` database IDs before mainnet launch         |
| Frontend Pages project | `open-care-web`                                                                                      | `open-care-web`; production domain setup is deferred until mainnet launch |

**Staging first:** rehearse the selected rollback on staging, run smoke checks,
and only then repeat against production. If the production incident is actively
harmful, freeze traffic-changing actions, get the incident commander approval,
and proceed with the smallest safe production rollback while a second operator
continues staging verification.

Do not include secrets in commands, logs, issue comments, or incident notes. Do
not run destructive D1 actions until the D1 decision gates below are complete.
Do not use the root `pnpm run deploy` as a rollback shortcut: it applies D1
migrations before deploying Workers and Pages.

## Contacts and escalation

| Role                 | When to involve                                                                 | Responsibility                                                              |
| -------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Incident commander   | Immediately for production, or staging if donor/operator flows are blocked      | Owns go/no-go decisions, timeline, and communications.                      |
| Cloudflare operator  | Any Worker, Pages, D1, route, secret, or log action                             | Runs Wrangler/Dashboard operations and confirms Cloudflare state.           |
| Ledger owner         | Any `vault-db`, migration, hash-chain, anchor, donation, or disbursement issue  | Decides whether forward-fix, restore, or limited SQL action is safe.        |
| Bot/privacy owner    | Any `bot-db`, Telegram bot, encrypted chat route, or beneficiary delivery issue | Confirms privacy impact and bot recovery steps.                             |
| Frontend owner       | Any Pages/UI/admin rollback                                                     | Confirms UI build, Pages deployment, and browser smoke coverage.            |
| Communications owner | User-facing impact, donor trust, public incident updates                        | Prepares status notes without exposing secrets or private beneficiary data. |

Escalate to the project owner and Cloudflare account owner if access is missing,
production D1 restore is being considered, secrets may be compromised, or the
rollback would hide/alter public ledger evidence.

## 0. Triage and freeze

1. Record the incident start time in UTC, affected environment, suspected bad
   commit SHA, and last known good commit SHA.
2. Stop new deploys:
   - Do not rerun `deploy.yml` or `deploy-prod.yml`.
   - Pause any queued deploy jobs in GitHub Actions if possible.
   - Tell operators not to run manual anchor/disbursement/correction actions
     unless the incident commander says they are part of mitigation.
3. Identify whether the failure is isolated to Workers, D1, frontend, or a
   combination:
   ```bash
   curl https://staging.open-care.org/api/health
   pnpm run verify:chain -- --base-url https://staging.open-care.org
   ```
   For production, use `https://open-care.org` only after production is enabled
   and the incident commander approves production checks.
4. Start log tails for the affected Workers only. Example:
   ```bash
   pnpm exec wrangler tail vault-api-read
   pnpm exec wrangler tail vault-api-read-production
   ```

## 1. Choose the rollback path

Use the smallest action that removes user impact.

```text
Bad UI only?          -> Roll back Pages first.
Bad Worker code only? -> Roll back Workers; do not touch D1.
Bad migration only?   -> Use D1 decision gates; prefer forward-fix or restore.
Mixed deploy?         -> Roll back Workers/Pages to compatible code, then D1 only if needed.
Secret compromise?    -> Rotate secret and redeploy affected Worker; see secrets inventory.
```

Before production rollback, complete the same path on staging unless delaying
production rollback would cause greater harm.

## 2. Roll back Workers

There are two supported manual options. Prefer **Option A** when Cloudflare has a
known-good Worker version; use **Option B** when the rollback must exactly
rebuild the previous commit or when Worker config changed in git.

### Option A — Cloudflare Worker version rollback

This is the fastest Worker rollback. `wrangler rollback` immediately creates a
new active deployment for the target Worker version.

1. For each affected staging Worker, list recent versions and choose the last
   known-good version ID:
   ```bash
   pnpm exec wrangler versions list --name vault-ingest
   pnpm exec wrangler versions list --name tg-bot
   pnpm exec wrangler versions list --name vault-api-read
   pnpm exec wrangler versions list --name vault-api-write
   pnpm exec wrangler versions list --name vault-anchor-cron
   pnpm exec wrangler versions list --name vault-operator
   ```
2. Roll back only the affected Workers. If no version ID is supplied, Wrangler
   defaults to the version uploaded before the latest version; using an explicit
   ID is safer during incidents.
   ```bash
   pnpm exec wrangler rollback --name vault-api-read <VERSION_ID> --message "rollback <incident-id>"
   ```
3. For production, target the production Worker names directly:
   ```bash
   pnpm exec wrangler versions list --name vault-api-read-production
   pnpm exec wrangler rollback --name vault-api-read-production <VERSION_ID> --message "rollback <incident-id>"
   ```
4. Repeat for every affected Worker. If `vault-operator` service bindings or a
   downstream service changed, roll back the operator and downstream Workers as a
   compatible set.

### Option B — redeploy previous commit's Workers

Use this when the previous commit is the rollback target.

1. Prepare a clean checkout at the previous good commit. Do not reset or force
   push the main branch.
   ```bash
   git fetch origin
   git switch --detach <PREVIOUS_GOOD_SHA>
   pnpm install --frozen-lockfile
   ```
2. Redeploy staging Workers from that checkout:
   ```bash
   (cd apps/ingest && pnpm exec wrangler deploy)
   (cd apps/tg-bot && pnpm exec wrangler deploy)
   (cd apps/api-read && pnpm exec wrangler deploy)
   (cd apps/api-write && pnpm exec wrangler deploy)
   (cd apps/anchor-cron && pnpm exec wrangler deploy)
   (cd apps/operator && pnpm exec wrangler deploy)
   ```
3. Redeploy production Workers from the same checkout only after staging passes:
   ```bash
   (cd apps/ingest && pnpm exec wrangler deploy --env production)
   (cd apps/tg-bot && pnpm exec wrangler deploy --env production)
   (cd apps/api-read && pnpm exec wrangler deploy --env production)
   (cd apps/api-write && pnpm exec wrangler deploy --env production)
   (cd apps/anchor-cron && pnpm exec wrangler deploy --env production)
   (cd apps/operator && pnpm exec wrangler deploy --env production)
   ```
4. Return to the working branch after the incident:
   ```bash
   git switch -
   ```

### Worker smoke checks

Run after staging Worker rollback and again after production Worker rollback:

```bash
curl https://staging.open-care.org/api/health
pnpm run verify:chain -- --base-url https://staging.open-care.org
```

Production equivalent after approval:

```bash
curl https://open-care.org/api/health
pnpm run verify:chain -- --base-url https://open-care.org
```

Check affected Worker logs for new errors before declaring rollback stable.

## 3. D1 migration and data rollback decision gates

D1 is the riskiest rollback area. The vault ledger is hash-chained and append-only;
some migrations are intentionally not reversible without weakening integrity.
Prefer a forward-fix migration or code rollback over direct database restore
whenever user data is intact.

### 3.1 Verify before touching D1

1. Confirm the affected database:
   - `vault-db` owner directory: `apps/ingest/migrations/`.
   - `bot-db` owner directory: `apps/tg-bot/migrations/`.
2. Confirm storage backend and restore options:
   ```bash
   (cd apps/ingest && pnpm exec wrangler d1 info vault-db --json)
   (cd apps/tg-bot && pnpm exec wrangler d1 info bot-db --json)
   ```
   Production uses the same logical database names through the production
   Wrangler environment once production D1 IDs are configured:
   ```bash
   (cd apps/ingest && pnpm exec wrangler d1 info vault-db --env production --json)
   (cd apps/tg-bot && pnpm exec wrangler d1 info bot-db --env production --json)
   ```
3. Capture current state before any destructive restore or inverse SQL:
   ```bash
   (cd apps/ingest && pnpm exec wrangler d1 export vault-db --remote --output /tmp/vault-db-before-rollback.sql)
   (cd apps/tg-bot && pnpm exec wrangler d1 export bot-db --remote --output /tmp/bot-db-before-rollback.sql)
   ```
   For production, add `--env production` to the commands after the database IDs
   are configured.
4. Check application-level integrity:
   ```bash
   pnpm run verify:chain -- --base-url https://staging.open-care.org
   curl https://staging.open-care.org/api/health
   ```

### 3.2 Decide: forward-fix, inverse migration, or restore

| Condition                                                                                | Preferred action                                                                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Code is incompatible with existing schema but data is intact                             | Roll back Workers or deploy a forward-fix migration.                                                            |
| Migration failed during `wrangler d1 migrations apply`                                   | Verify state; Wrangler rolls back the failed migration, so a Worker rollback may be enough.                     |
| Migration only adds reversible non-ledger objects                                        | Consider a reviewed inverse migration, applied first to staging.                                                |
| Migration affects `ledger_events`, hash chain, anchors, or donation/disbursement records | Do **not** directly update/delete ledger rows. Escalate to ledger owner; prefer forward-fix or full D1 restore. |
| Data was corrupted or an unsafe migration committed bad state                            | Restore from D1 Time Travel/backup after approval.                                                              |

Append-only ledger migrations may not be directly reversible. For example,
dropping the `ledger_events` append-only triggers can unblock an emergency but
weakens an invariant; only do it as a reviewed, time-boxed mitigation with a
follow-up migration that restores the invariant.

### 3.3 If an inverse migration is safe

1. Write a new forward migration that undoes only the bad schema change. Do not
   edit an already-applied migration file.
2. Apply it to staging from the database owner app:
   ```bash
   (cd apps/ingest && pnpm exec wrangler d1 migrations apply vault-db --remote)
   (cd apps/tg-bot && pnpm exec wrangler d1 migrations apply bot-db --remote)
   ```
3. Run staging smoke checks and targeted app checks.
4. After approval, apply to production with `--env production --remote` from the
   same owner app.

### 3.4 If D1 restore is required

Restoring D1 overwrites the database in place and can cancel in-flight queries.
It must be approved by the incident commander and the relevant data owner.

1. Identify the restore timestamp immediately before the bad migration or data
   write. Use UTC from GitHub Actions logs, Wrangler output, or incident notes.
2. Get a Time Travel bookmark on staging:
   ```bash
   (cd apps/ingest && pnpm exec wrangler d1 time-travel info vault-db --timestamp "<RFC3339_UTC_TIMESTAMP>")
   (cd apps/tg-bot && pnpm exec wrangler d1 time-travel info bot-db --timestamp "<RFC3339_UTC_TIMESTAMP>")
   ```
3. Restore staging first:
   ```bash
   (cd apps/ingest && pnpm exec wrangler d1 time-travel restore vault-db --bookmark <BOOKMARK>)
   (cd apps/tg-bot && pnpm exec wrangler d1 time-travel restore bot-db --bookmark <BOOKMARK>)
   ```
4. Record the "previous bookmark" printed by Wrangler so the restore itself can
   be undone if the wrong point was selected.
5. Run staging verification:
   ```bash
   curl https://staging.open-care.org/api/health
   pnpm run verify:chain -- --base-url https://staging.open-care.org
   ```
6. Repeat for production only after approval, adding `--env production` to the
   `d1 time-travel` commands once production D1 IDs are configured.
7. If `wrangler d1 info` shows a legacy `alpha` database, use the legacy backup
   flow instead: list backups, select a backup ID, capture an export, then restore
   the backup. Treat it with the same approval and staging-first gates.

## 4. Roll back the frontend

Use the smallest Pages rollback that fixes the issue.

### Option A — Cloudflare Pages deployment rollback

Cloudflare Pages supports instant rollback to a previous successful production
deployment from the Dashboard. Preview deployments are not rollback targets.

1. Open Cloudflare Dashboard → Workers & Pages → Pages → `open-care-web` →
   Deployments.
2. Select the last known-good production deployment for the affected domain.
3. Use **Rollback to this deployment** and confirm.
4. Verify the domain:
   ```bash
   curl https://staging.open-care.org/
   curl https://staging.open-care.org/api/health
   ```

### Option B — redeploy previous commit's frontend build

Use this when the previous good commit should be rebuilt and uploaded.

1. Check out the previous good commit without rewriting branch history:
   ```bash
   git fetch origin
   git switch --detach <PREVIOUS_GOOD_SHA>
   pnpm install --frozen-lockfile
   ```
2. Build and deploy the Pages artifact:
   ```bash
   cd apps/web
   pnpm build
   pnpm exec wrangler pages deploy .svelte-kit/cloudflare --project-name=open-care-web --branch=main --commit-hash <PREVIOUS_GOOD_SHA> --commit-message "rollback <incident-id>"
   ```
3. Return to the working branch after the incident:
   ```bash
   git switch -
   ```

If production and staging share the same Pages project/branch at the time of the
incident, coordinate carefully: a Pages rollback may affect every custom domain
attached to the active production deployment.

## 5. Post-rollback verification

Run the checks that match the affected environment.

```bash
curl https://staging.open-care.org/api/health
curl https://staging.open-care.org/api/verify
pnpm run verify:chain -- --base-url https://staging.open-care.org
```

If production is enabled and was rolled back:

```bash
curl https://open-care.org/api/health
curl https://open-care.org/api/verify
pnpm run verify:chain -- --base-url https://open-care.org
```

Also confirm:

- Cloudflare Worker logs show no new error spike for affected Workers.
- Pages serves the expected UI build and admin routes load.
- `vault-operator` routes still reach service-bound downstream Workers.
- Cron-triggered Workers (`vault-ingest`, `vault-anchor-cron`) have the expected
  triggers after rollback.
- D1 verification was run before and after any D1 action.

## 6. Closeout

1. Record exactly what was rolled back: Worker names/version IDs, commit SHA,
   Pages deployment ID, D1 timestamp/bookmark or backup ID, and verification
   results.
2. File a follow-up issue for the permanent fix. If D1 was restored, include the
   restore timestamp and the Wrangler "previous bookmark" for auditability.
3. Resume deploy workflows only after the incident commander confirms the repo
   contains a forward fix or the bad commit is no longer deployable.
4. If production was affected, prepare a public/internal incident note with the
   communications owner. Include impact and mitigation; exclude secrets,
   Telegram identifiers, private beneficiary data, and gift-card codes.
