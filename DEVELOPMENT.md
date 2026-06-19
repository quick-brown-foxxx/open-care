# Development Guide

Quick-start patterns for working on this project. For architecture and system
shape, see `AGENTS.md`. For deployed secrets and readiness, see
`docs/ops/secrets-inventory.md`.

## Mental model

This is a Cloudflare Workers monorepo, not a classic long-running server.

| Classic (NestJS/Next.js)          | Edge (this project)                                    |
| --------------------------------- | ------------------------------------------------------ |
| Long-running Node process         | Fresh V8 isolate per request                           |
| `process.env` / `.env`            | `.dev.vars` (local) / `wrangler secret put` (deployed) |
| Docker → build → deploy (minutes) | `wrangler deploy` (~12s, global edge in <30s)          |
| Separate staging infra            | Same infra, different secrets and domain               |
| In-memory state between requests  | Stateless. Use D1 for persistence.                     |

## Local dev

- Copy `.env.example` → `.dev.vars` (gitignored). `wrangler dev` reads `.dev.vars`, not `.env`.
- Use fake/generated keys locally; never put staging/prod secrets in `.dev.vars`.
- Per-app dev server:

  ```bash
  cd apps/<name>
  pnpm dev          # wrangler dev → http://localhost:8787
  ```

What happens:

- `wrangler dev` runs the real Cloudflare runtime (Workerd) locally.
- D1 bindings point to a local SQLite file (auto-created).
- `.dev.vars` secrets are injected as env bindings.
- Console output appears in your terminal.
- Edit source → next request uses new code (no restart needed).

Local dev is **not a mock**. It's the same V8 isolate, same D1 engine, same Web
Crypto API as production.

### Local D1 migrations

```bash
pnpm exec wrangler d1 migrations apply vault-db --local
pnpm exec wrangler d1 migrations apply bot-db --local
```

## Quality gates (run before commit/PR)

```bash
pnpm run final-check   # install → secret scan → ledger guard → sync → lint/format/check/test/build
```

This runs the exact same sequence as CI, including the secret scan and ledger mutation guard.
All gates must exit 0.

Individual gates:

```bash
pnpm run format:check   # prettier --check .
pnpm run lint           # eslint .
pnpm run check          # tsc -b
pnpm run test           # vitest run
pnpm run build          # tsc -b + SvelteKit build
pnpm run final-check:secret-scan # scan repo source, docs, tools, and root files for treasury key material
pnpm run final-check:ledger-guard # reject ledger_events UPDATE/DELETE in production src dirs
```

## Secrets and config

- Access secrets in code via Hono bindings (`c.env.SECRET_NAME`), **not** `process.env`.
- Deployed secrets are set with `wrangler secret put` per Worker. See `docs/ops/secrets-inventory.md`.
- The **treasury private key is never in Workers, CI, repo, or logs** — operator custody only.
- Public config values (e.g. `USDC_MINT`, treasury/anchor addresses) live in `.env.example` / `wrangler.jsonc` vars, not secrets.

## Deploy

- All-in-one staging deploy:

  ```bash
  pnpm run deploy       # migrations → 6 Workers → frontend Pages
  ```

- Per-app deploy from inside the app directory:

  ```bash
  cd apps/<name>
  pnpm exec wrangler deploy
  ```

- Frontend only:

  ```bash
  pnpm run deploy:frontend
  ```

- Staging is the default environment. No `--env production` setup exists yet.
- Live logs: `pnpm exec wrangler tail <worker-name>`.

### Apply D1 migrations (staging)

```bash
pnpm exec wrangler d1 migrations apply vault-db
pnpm exec wrangler d1 migrations apply bot-db
```

### Verify

```bash
curl https://staging.open-care.org/api/health
curl -X POST https://staging.open-care.org/webhook/helius \
  -H "Authorization: Bearer <HELIUS_WEBHOOK_AUTH_HEADER>" -d '{}'
pnpm run verify:chain -- --base-url https://staging.open-care.org
```

`verify:chain` requires an explicit deployment base URL or
`VERIFY_CHAIN_BASE_URL`; it recomputes `/api/ledger-events` hashes and checks
published anchor metadata from `/api/verify`.

## Seed data (local dev)

```bash
pnpm run seed   # applies migrations + seed data for both D1 databases
```

## Local Solana validator smoke

Use the localnet harness when developing blockchain-facing tests or checking
fixture setup against a real `solana-test-validator` process:

```bash
pnpm run blockchain:local-validator
pnpm run blockchain:local-validator -- --allow-skip
pnpm run blockchain:local-validator -- --rpc-port 8899 --keep-ledger
pnpm run blockchain:local-validator -- --test-command "pnpm run test"
```

The harness preflights `solana-test-validator`, starts an isolated validator with
`--reset`, creates throwaway localnet keypairs, creates an SPL Token mint, funds a
donor/source token account, creates a treasury owner and vault ATA, and then runs
either a built-in SPL transfer + memo smoke or the provided test command. It
prints public addresses/signatures only; no devnet/mainnet secrets are required
or read.

Temporary validator ledgers and generated keypairs are removed on normal exit,
failure, and Ctrl+C. Pass `--keep-ledger` only when you need to inspect the temp
ledger path printed by the command. On machines without Solana CLI tooling,
`--allow-skip` exits 0 with a `SKIP` message instead of failing the whole dev
loop.

## The dev loop

```text
write code → wrangler dev (local test) → vitest (unit/integration)
          → wrangler deploy (staging) → curl verify → wrangler tail (logs)
          → repeat
```

Each deploy cycle is ~15 seconds. There is no Docker build, no container
orchestration, no SSH.

## Future local infra extension

Webhook simulation fixtures and richer chain-state seeders are still future
work. Keep additional realistic simulation tooling isolated in dedicated tools
or test fixtures rather than bolting ad hoc setup onto the main dev loop.
