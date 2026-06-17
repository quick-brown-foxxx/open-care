# Implementation Plan — Open Care MVP

**Status:** Active  
**Date:** 2026-06-16  
**Scope:** High-level epics and slices for the full MVP build

## Principle

**All draft/mock code is overwritten, not extended.** Infra-level configs (`wrangler.jsonc`, `package.json` names/deps, `tsconfig.json` options, D1 migrations, `pnpm-workspace.yaml`, `.env.example`) are preserved. Everything else in `src/` is replaced.

## Current State

| What                                                      | Status                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| D1 migrations (`vault-db`, `bot-db`)                      | ✅ Real, deployed, spec-aligned                                               |
| `wrangler.jsonc` configs (bindings, routes, D1 IDs, vars) | ✅ Real, preserve                                                             |
| `package.json` files (names, deps, scripts)               | ✅ Real, preserve; workspace deps added to all apps                            |
| `tsconfig.json` files                                     | ✅ Root with project references; all 9 sub-projects extend root               |
| `pnpm-workspace.yaml`, `.env.example`                     | ✅ Real, preserve                                                             |
| Worker `src/index.ts` (all 6)                             | ✅ Clean typed Hono stubs with correct bindings, route stubs, package imports |
| `packages/vault-core/src/`                                | ✅ Full impl: canonical JSON, 4 event schemas, hash chain, test vector (221 tests) |
| `packages/vault-db/src/`                                  | ✅ Full impl: Drizzle schemas (6 tables), ledger append, query helpers (72 tests) |
| `packages/bot-crypto/src/`                                | ✅ Full impl: HMAC-SHA256, AES-GCM encrypt/decrypt, base64url (95 tests)      |
| `apps/web/src/`                                           | ✅ Clean SvelteKit 2 + Svelte 5 scaffold: API client, Valibot schemas, utils, Bits UI |
| ESLint, Prettier, Vitest, Playwright configs              | ✅ All configured at root                                                     |
| Root `tsconfig.json` (project references)                 | ✅ 9 project references, strict compilerOptions                               |
| Drizzle ORM schemas                                       | ✅ vault-db (4 tables) + bot-db (2 tables), drizzle.config.ts                 |
| GitHub Actions CI workflow                                | ✅ `.github/workflows/ci.yml` (lint, format:check, typecheck, test, build)    |

---

## Epic 0: Project Bootstrap — Overwrite Drafts, Install Real Foundation ✅

**Status:** Complete (2026-06-17)  
**Goal:** Clean, lintable, type-safe foundation. Shared packages have real types and schemas. Workers compile, typecheck, and pass empty test suites. Frontend is a clean SvelteKit scaffold.  
**Evidence:** `tsc -b` clean (11 projects), 388 tests pass (14 files), SvelteKit build succeeds, format:check passes. 16 lint errors are known tooling limitations (cloudflare:test virtual module, SvelteKit $lib alias, svelte-eslint-parser Svelte 5 syntax gap).

### Slice 0.1: Root Tooling & Config

- Root `tsconfig.json` with project references
- ESLint flat config (TypeScript, Svelte rules)
- Prettier config
- Vitest workspace config
- Playwright config
- Root scripts: `lint`, `format`, `check`, `test`, `build`
- `.github/workflows/ci.yml` (lint, typecheck, test, build)

### Slice 0.2: `packages/vault-core` — Event Schemas & Canonical JSON

- RFC 8785 canonical JSON implementation
- Event type definitions and Zod schemas for all 4 event types
- Hash chain: `computeEventHash()`, `verifyChain()`
- Normative test vector assertion (pinned hash `fda2610f...`)
- `public_beneficiary_ref` generator (`benpub_` + 80-bit random base32)
- Solana Memo text builder (`ccv-anchor:<64hex>`)
- Unit tests: canonical JSON, hash chain, test vector, memo format, beneficiary ref

### Slice 0.3: `packages/vault-db` — Drizzle Schemas & Query Helpers

- Drizzle schema for `vault-db` tables (`ledger_events`, `wallets`, `anchor_runs`, `helius_inbox`)
- Drizzle schema for `bot-db` tables (`handles`, `conversations`)
- `drizzle.config.ts`
- Ledger append helper (serializes writes, computes hash, retries on conflict)
- Query helpers: `getHead()`, `getEventsPaginated()`, `getTotals()`
- Unit tests with local D1

### Slice 0.4: `packages/bot-crypto` — HMAC & Encryption

- `deriveTelegramUserRef(key, id)` → HMAC-SHA256
- `encryptChatId(key, keyVersion, opaqueId, chatId)` → AES-GCM envelope
- `decryptChatId(key, envelope)` → plaintext
- AAD binding: `ccv:tg-chat-route:<opaqueId>:<keyVersion>`
- Unit tests: stability, different-key, round-trip, AAD tamper rejection

### Slice 0.5: Workers Clean Slate

For each of the 6 Workers, **delete everything in `src/`** and write clean stubs:

- Typed Hono app with correct bindings
- Route stubs matching spec (empty handlers)
- `export default app` (Workers) or `export default { fetch, scheduled }` (anchor-cron)
- All import from `@open-care/vault-core`, `@open-care/vault-db`, `@open-care/bot-crypto`
- All compile and typecheck

### Slice 0.6: Frontend Clean Slate

- **Delete `apps/web/src/`** entirely
- Rebuild from scratch: SvelteKit 2 + Svelte 5 + adapter-cloudflare
- `src/app.html`, `src/app.css` (design tokens, minimal reset)
- `src/routes/+layout.svelte`, `src/routes/+page.svelte` (placeholder), `src/routes/+error.svelte`
- `src/lib/api/` (typed API client)
- `src/lib/schemas/` (Valibot schemas)
- `src/lib/utils/` (formatting helpers)
- `src/lib/components/ui/` (shadcn-svelte init)
- `pnpm build` succeeds

---

## Epic 1: Ledger Core — Hash Chain & Read/Write API ✅

**Status:** Complete (2026-06-17)  
**Goal:** Append events, compute hash chain, read via public API.  
**Evidence:** `tsc -b` clean (12 projects), 452 tests pass (25 files), SvelteKit build succeeds. Write path (POST /api/disbursements) with Zod validation + hash-chained append, read API (6 endpoints with 60s cache), operator auth gateway (constant-time token + CORS + service binding forwarding), seed data + fixtures + `pnpm seed` script.

### Slice 1.1: `vault-api-write` — Ledger Append

- `POST /api/disbursements` — Zod validation, `public_beneficiary_ref` generation, ledger append
- Standard error contract
- Integration tests: valid, validation errors, hash chain integrity

### Slice 1.2: `vault-api-read` — Public Read Endpoints

- `GET /api/health` — real D1 check, anchor wallet SOL
- `GET /api/totals` — aggregate from `ledger_events`
- `GET /api/donations` — paginated read model
- `GET /api/disbursements` — paginated read model
- `GET /api/ledger-events` — canonical export
- `GET /api/verify` — head hash, latest anchor, instructions
- Cache headers (60s TTL)
- Integration tests with seeded D1

### Slice 1.3: `vault-operator` — Auth Gateway

- Constant-time token comparison
- Service binding forwarding
- CORS for frontend origin
- Integration tests: valid/invalid/missing token, forwarding correctness

### Slice 1.4: Seed Data & Test Harness

- D1 seed migration with sample rows
- Test fixtures for all event types
- Local dev `pnpm seed` script

---

## Epic 2: Donation Ingest — Helius Webhook to Ledger ✅

**Status:** Complete (2026-06-17)  
**Goal:** Real USDC transfer → `donation_confirmed` ledger event.  
**Evidence:** 32 integration tests pass. Webhook handler with constant-time auth, durable inbox, async SPL USDC transfer parsing, duplicate-safe ledger append, RPC retry, reconciliation endpoint.

### Slice 2.1: `vault-ingest` — Webhook Handler

- Constant-time auth header comparison
- `INSERT OR IGNORE` into `helius_inbox`, fast 200 ACK
- `ctx.waitUntil` for async processing
- Integration tests: valid webhook, invalid auth, duplicate replay

### Slice 2.2: `vault-ingest` — Async Transaction Processing

- Fetch transaction with `commitment: "finalized"`
- SPL USDC transfer parsing (mint, ATA, `instruction_index`/`inner_index`)
- Duplicate-safe ledger append
- RPC retry (null-before-finality, 429, 5xx)
- Inbox status transitions: `received` → `processed`/`ignored`/`failed`/`duplicate`

### Slice 2.3: Reconciliation Job

- Scheduled handler: scan vault USDC ATA history for missed signatures
- Insert into `helius_inbox` with `source='reconciliation'`
- Same async processor handles both webhook and reconciliation rows

---

## Epic 3: Anchor Cron — Daily Solana Memo Anchor ✅

**Status:** Complete (2026-06-17)  
**Goal:** Daily cron sends Memo transaction committing the ledger head hash.  
**Evidence:** 22 integration tests pass. 9-step anchor pipeline, lock protocol, stale lock recovery, manual trigger via operator service binding, scheduled handler.

### Slice 3.1: Anchor Pipeline

- `runAnchor()` in `packages/vault-core`
- Compute ledger head, build Memo instruction
- Sign and send with `@solana/web3.js` v1
- Lock protocol (`anchor_runs.locked_until_utc`)
- Write `last_anchor_wallet_sol_lamports`
- On success: append `anchor_published`, set `status='published'`, clear lock
- On failure: set `status='failed'`, clear lock

### Slice 3.2: Recovery & Manual Trigger

- Stale lock detection, on-chain tx lookup
- Backfill event with `created_at_utc = published_at_utc`
- `POST /api/anchor/manual` via operator service binding
- `409 CONFLICT`, `503 UNAVAILABLE` responses

---

## Epic 4: Telegram Bot — Beneficiary Interaction ✅

**Status:** Complete (2026-06-17)  
**Goal:** `/start`, `/card`, delivery flow works end-to-end.  
**Evidence:** 77 integration tests pass. Webhook handler, 4 commands, HMAC user refs + AES-GCM encrypted chat routes, redacted operator view, send-code delivery with hash/last4 retention.

### Slice 4.1: `tg-bot` — Registration & Commands

- Telegram webhook secret verification
- `/start <handle>` — HMAC ref, encrypted chat route, no plaintext IDs
- `/start` (no handle) — prompt
- `/whoami`, `/help`
- Integration tests with mock Telegram API

### Slice 4.2: `tg-bot` — Card Request & Delivery

- `/card` — pending conversation row
- `GET /tg/internal/pending-requests` — redacted operator view
- `POST /tg/internal/send-code` — decrypt, send, update status
- Gift-card code: hash/last4 after delivery, short-TTL encrypted retry
- Janitor for expired blobs
- Integration tests: full flow, redaction verification

---

## Epic 5: Frontend — Public & Operator UI

**Goal:** Working frontend that reads from APIs.

See [[./ui-prototypes/]] for UI plans, docs and prototypes.

### Slice 5.1: Public Shell & Landing

- Layout, navigation, footer
- `/` landing: totals, recent donations, verify CTA
- `/about`, `/faq`, `/contact` — prerendered with required content

### Slice 5.2: Donate & Ledger

- `/donate` — address, ATA, QR, warnings
- `/ledger` — paginated history
- `/ledger/[eventHash]` — event detail

### Slice 5.3: Verify Page

- `/verify` — head hash, anchor memo, export, pre-anchor-head explanation

### Slice 5.4: Operator Admin

- `/admin` — memory-only token, idle timeout
- `/admin/disbursements` — recording form
- `/admin/anchors` — manual trigger, status
- Bot handoff: pending list, send-code flow

---

## Epic 6: CI/CD & Production Readiness

**Goal:** PR CI is green. Staging deploys automatically.

### Slice 6.1: GitHub Actions CI

- Lint, typecheck, format, test, build on PR
- Playwright in CI
- No paid funds or mainnet secrets

### Slice 6.2: Staging Deployment

- Per-app `wrangler deploy` on merge to main
- Frontend Pages deployment
- D1 migration apply on deploy

### Slice 6.3: Monitoring & Logging

- Structured JSON logging
- Log redaction: no secrets, no Telegram IDs, no gift-card codes
- Health checks (D1, anchor staleness, inbox backlog)

---

## Execution Order

**Epic 0: ✅ Complete (2026-06-17)**
**Epic 1: ✅ Complete (2026-06-17)**
**Epic 2: ✅ Complete (2026-06-17)**
**Epic 3: ✅ Complete (2026-06-17)**
**Epic 4: ✅ Complete (2026-06-17)**

**Next:**

- Epic 5 (frontend) — needs read API (done in 1.2), all backend Workers ready
- Epic 6 (CI/CD) — CI workflow already in place; deploy + monitoring remain

---

## Key Decisions

| Decision                | Choice                                                                         |
| ----------------------- | ------------------------------------------------------------------------------ |
| Drop all draft code?    | Yes — overwrite `src/` everywhere                                              |
| Preserve infra configs? | Yes — wrangler.jsonc, package.json names/deps, tsconfig options, D1 migrations |
| Frontend restart?       | Yes — delete `apps/web/src/` entirely, fresh SvelteKit scaffold                |
| Hash canonicalization   | RFC 8785 (JCS), normative test vector pinned                                   |
| Solana SDK              | `@solana/web3.js` v1 (`^1.98.4`)                                               |
| HTTP routing            | Hono                                                                           |
| Validation              | Zod (backend), Valibot (frontend)                                              |
| ORM                     | Drizzle with D1 driver                                                         |
| Test runner             | Vitest                                                                         |
| Browser tests           | Playwright                                                                     |
| Telegram E2E            | Telethon + pytest (manual/nightly, not PR CI)                                  |
