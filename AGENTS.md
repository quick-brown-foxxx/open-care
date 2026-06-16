# OpenCode Agent Notes

**Status:** Bootstrap / pre-implementation. This file is intentionally thin; rules, architecture detail, and workflows will move in later. For day-to-day commands and environment workflows, see @DEVELOPMENT.md and `docs/ops/secrets-inventory.md` first.

## Project shape

- Cloudflare Workers monorepo, pnpm workspace (`apps/*`, `packages/*`, `tools/*`).
- Runtime is **stateless V8 isolate per request**; persistence is D1, not memory.
- Package manager: `pnpm@11.6.0`.

## Apps and entrypoints

| App | Worker name | Binding | `wrangler.jsonc` | Code status |
| --- | --- | --- | --- | --- |
| `apps/ingest` | `vault-ingest` | `vault_db` (D1: `vault-db`) | has route `staging.open-care.org/webhook/helius` | mock: validates `Authorization` header |
| `apps/tg-bot` | `tg-bot` | `bot_db` (D1: `bot-db`) | has route `staging.open-care.org/tg/webhook` | mock: validates `X-Telegram-Bot-Api-Secret-Token` |
| `apps/api-read` | `vault-api-read` | `vault_db` | no route, public surface (see below) | config only, no `src/` yet |
| `apps/api-write` | `vault-api-write` | `vault_db` | no public route; reached only via service binding from `vault-operator` | config only, no `src/` yet |
| `apps/anchor-cron` | `vault-anchor-cron` | `vault_db` | no public route, cron `0 1 * * *`; reached via service binding from `vault-operator` for manual triggers | config only, no `src/` yet |
| `apps/operator` | `vault-operator` | none (no D1 binding); uses service bindings to `vault-api-write`, `vault-anchor-cron`, `tg-bot`; holds `OPERATOR_TOKEN` | no route (operates as an internal auth-and-route layer; the operator UI calls it via a public HTTPS path or via a Pages Function proxy) | config only, no `src/` yet |
| `apps/web` | (Pages) | — | — | not created yet |

**`vault-operator` is the sole holder of `OPERATOR_TOKEN`.** All operator-authenticated
endpoints (`/api/disbursements`, `/api/anchor/manual`, `/tg/internal/pending-requests`,
`/tg/internal/send-code`) flow through it; the token is never in
`vault-api-write` or `tg-bot`. Service bindings are in-process and
not-publicly-routable, so the downstream Workers are not exposed to the
public internet for these routes. See
[`docs/specs/01-architecture.md`](docs/specs/01-architecture.md) §"Operator
Worker trust model" for the full design.

**`vault-api-read`** exposes the public, no-auth surface
(`/api/totals`, `/api/donations`, `/api/disbursements` (the public list, not
the write), `/api/ledger-events`, `/api/verify`, `/api/health`). The
`/api/health.anchor_wallet_low_sol` field reads the cached
`anchor_runs.last_anchor_wallet_sol_lamports` value written by
`vault-anchor-cron`; the read Worker has no RPC binding.

All Workers use Hono. Main export is the Hono app from `src/index.ts`.

## Local dev

- Copy `.env.example` → `.dev.vars` (gitignored). `wrangler dev` reads `.dev.vars`, not `.env`.
- Use fake/generated keys locally; never put staging/prod secrets in `.dev.vars`.
- Per-app dev server:

  ```bash
  cd apps/<name>
  pnpm dev          # wrangler dev → http://localhost:8787
  ```

- D1 is local SQLite automatically. Migrations are applied per DB name:

  ```bash
  pnpm exec wrangler d1 migrations apply vault-db --local
  pnpm exec wrangler d1 migrations apply bot-db --local
  ```

## Secrets and config

- Access secrets in code via Hono bindings (`c.env.SECRET_NAME`), **not** `process.env`.
- Deployed secrets are set with `wrangler secret put` per Worker. See `docs/ops/secrets-inventory.md` for what is already pushed, what each Worker requires, and rotation rules.
- The **treasury private key is never in Workers, CI, repo, or logs** — operator custody only.
- Public config values (e.g. `USDC_MINT`, treasury/anchor addresses) live in `.env.example` / `wrangler.jsonc` vars, not secrets.

## Deploy

- Per-app deploy from inside the app directory:

  ```bash
  cd apps/<name>
  pnpm exec wrangler deploy
  ```

- Staging is the default environment. No `--env production` setup exists yet.
- Live logs: `pnpm exec wrangler tail <worker-name>`.

## What does not exist yet (agent must create)

- `packages/vault-core/`, `packages/vault-db/`, `packages/bot-crypto/`.
- `apps/web/` (SvelteKit frontend).
- Real Worker implementations for ingest, tg-bot, api-read, api-write, anchor-cron.
- D1 migration SQL files.
- Shared tooling configs: ESLint, Prettier, Vitest, Playwright, GitHub workflows, root lint/typecheck/test scripts.
- Keep additions incremental and consistent with `DEVELOPMENT.md`.
