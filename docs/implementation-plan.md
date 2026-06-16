# Implementation Plan — Open Care MVP

**Status:** Active  
**Date:** 2026-06-16  
**Scope:** High-level epics and slices for the full MVP build

## Principle

**All draft/mock code is overwritten, not extended.** Infra-level configs (`wrangler.jsonc`, `package.json` names/deps, `tsconfig.json` options, D1 migrations, `pnpm-workspace.yaml`, `.env.example`) are preserved. Everything else in `src/` is replaced.

## Current State

| What | Status |
|------|--------|
| D1 migrations (`vault-db`, `bot-db`) | ✅ Real, deployed, spec-aligned |
| `wrangler.jsonc` configs (bindings, routes, D1 IDs, vars) | ✅ Real, preserve |
| `package.json` files (names, deps, scripts) | ✅ Real, preserve |
| `tsconfig.json` files | ❌ Minimalistic, remove and overwrite |
| `pnpm-workspace.yaml`, `.env.example` | ✅ Real, preserve |
| Worker `src/index.ts` (all 6) | ❌ Draft — hardcoded responses, `!==` auth |
| `packages/vault-core/src/` | ❌ Empty scaffold (`export {}`) |
| `packages/vault-db/src/` | ❌ Empty scaffold |
| `packages/bot-crypto/src/` | ❌ Empty scaffold |
| `apps/web/src/` | ❌ Hardcoded Russian text, no API calls |
| ESLint, Prettier, Vitest, Playwright configs | ❌ Missing |
| Root `tsconfig.json` (project references) | ❌ Missing |
| Drizzle ORM schemas | ❌ Missing |
| GitHub Actions CI workflow | ❌ Missing |

---

## Epic 0: Project Bootstrap — Overwrite Drafts, Install Real Foundation

**Goal:** Clean, lintable, type-safe foundation. Shared packages have real types and schemas. Workers compile, typecheck, and pass empty test suites. Frontend is a clean SvelteKit scaffold.

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

## Epic 1: Ledger Core — Hash Chain & Read/Write API

**Goal:** Append events, compute hash chain, read via public API.

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

## Epic 2: Donation Ingest — Helius Webhook to Ledger

**Goal:** Real USDC transfer → `donation_confirmed` ledger event.

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

## Epic 3: Anchor Cron — Daily Solana Memo Anchor

**Goal:** Daily cron sends Memo transaction committing the ledger head hash.

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

## Epic 4: Telegram Bot — Beneficiary Interaction

**Goal:** `/start`, `/card`, delivery flow works end-to-end.

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

**Start with:**

1. **Slice 0.1** — Root tooling (ESLint, Prettier, Vitest, tsconfig, CI)
2. **Slice 0.2** — `vault-core` event schemas & hash chain (foundation for everything)
3. **Slice 0.3** — `vault-db` Drizzle schemas (needed by all Workers)
4. **Slice 0.4** — `bot-crypto` HMAC & encryption (needed by tg-bot)

**Then parallelize:**

- Epic 1 (ledger core) and Epic 2 (ingest) and Epic 3 (anchor) can proceed largely in parallel after 0.2–0.4
- Epic 4 (tg-bot) can start after 0.3 + 0.4
- Epic 5 (frontend) can start after 0.6 + 1.2 (needs read API)

**Final polish:**

- Epic 6 (CI/CD) can start as soon as Slice 0.1 is done and grow incrementally
- Invariant tests (from `08-testing-strategy.md`) are woven into each slice, not a separate epic

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| Drop all draft code? | Yes — overwrite `src/` everywhere |
| Preserve infra configs? | Yes — wrangler.jsonc, package.json names/deps, tsconfig options, D1 migrations |
| Frontend restart? | Yes — delete `apps/web/src/` entirely, fresh SvelteKit scaffold |
| Hash canonicalization | RFC 8785 (JCS), normative test vector pinned |
| Solana SDK | `@solana/web3.js` v1 (`^1.98.4`) |
| HTTP routing | Hono |
| Validation | Zod (backend), Valibot (frontend) |
| ORM | Drizzle with D1 driver |
| Test runner | Vitest |
| Browser tests | Playwright |
| Telegram E2E | Telethon + pytest (manual/nightly, not PR CI) |