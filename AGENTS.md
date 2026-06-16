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
| `apps/api-read` | `vault-api-read` | `vault_db` | no route | config only, no `src/` yet |
| `apps/api-write` | `vault-api-write` | `vault_db` | no route | config only, no `src/` yet |
| `apps/anchor-cron` | `vault-anchor-cron` | `vault_db` | no route, cron `0 1 * * *` | config only, no `src/` yet |
| `apps/web` | (Pages) | — | — | not created yet |

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
