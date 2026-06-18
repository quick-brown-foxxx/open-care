# Backlog: Post-Review Hardening

**Date:** 2026-06-18
**Source:** [Comprehensive Review Summary](../review-2026-06-18-summary.md)
**Spec:** [`docs/specs/13-post-review-hardening.md`](../specs/13-post-review-hardening.md)

## Priority Ordering Rationale

1. **P0–P2 fixes first** — they are actual bugs or correctness risks.
   The ingest error shape bug (P0) means the frontend silently swallows
   ingest errors today. Duplicated `constantTimeEqual` (P1) is a
   security primitive with divergent implementations. Duplicated
   `errorResponse` (P2) means different Workers return different error
   shapes.

2. **Shared API contract types second** — prevents future bugs of the
   same class as P0. Enables safer P3–P5 fixes by providing a single
   source of truth for type shapes. Low risk, high leverage.

3. **Critical test gaps third** — proves the P0–P2 fixes work and
   closes the highest-risk untested error paths. Without these tests,
   regressions in the fixed code could go undetected.

4. **Testing layer build-out fourth** — higher investment (new
   infrastructure, external service dependencies). Depends on having a
   solid base of unit/integration tests (which Epics 1–3 strengthen).
   Gated behind environment flags; kept out of PR CI.

5. **Code quality cleanup fifth** — lower risk, mostly additive
   (Zod schemas, tsconfig fixes). Some items (P5 `request_id`) are
   already addressed in Epic 1.

6. **Environment polish last** — cosmetic config fixes. No invariants
   affected. Each slice is independent and reversible.

---

## Epic 1: Fix Critical Code Defects (P0–P2)

**Priority:** P0 (must fix before production launch)
**Depends on:** None
**Risk:** Medium — changes error shapes visible to frontend

### Goal

Eliminate the three critical code defects identified in the review:
non-compliant ingest error shape, duplicated `constantTimeEqual`, and
duplicated `errorResponse` builder. Standardize error handling across
all 6 Workers per [`04-api.md`](../specs/04-api.md) §"Standard error
response".

### Slices

#### Slice 1.1: Standardize ingest error shape (P0)

- **Scope:** Restructure `apps/ingest/src/lib/errors.ts` to return
  `{ error: { code, message } }` instead of flat strings. Update all
  ingest route handlers. Add test verifying ingest error responses
  match the standard shape.
- **Files:** `apps/ingest/src/lib/errors.ts`,
  `apps/ingest/src/routes/webhook.ts`,
  `apps/ingest/test/errors.test.ts` (new or existing).
- **Acceptance criteria:**
  - `POST /webhook/helius` with no auth returns
    `{ error: { code: "UNAUTHORIZED", message: "...", request_id: "..." } }`.
  - Frontend error handler can parse ingest errors correctly.
  - Existing ingest tests still pass.
- **Verification:** `curl` staging endpoint, `pnpm exec vitest run --filter ingest`.

#### Slice 1.2: Extract canonical `constantTimeEqual` to vault-core (P1)

- **Scope:** Move the two-tier `timingSafeEqual` + XOR fallback
  implementation from `apps/ingest` into
  `packages/vault-core/src/lib/constant-time.ts`. Export as the single
  canonical `constantTimeEqual`. Replace all 3 local copies (operator,
  ingest, tg-bot) with imports from `@open-care/vault-core`. Add tests
  verifying identical behavior across all call sites.
- **Files:** `packages/vault-core/src/lib/constant-time.ts` (new),
  `apps/ingest/src/lib/auth.ts`, `apps/operator/src/lib/auth.ts`,
  `apps/tg-bot/src/lib/auth.ts`,
  `packages/vault-core/test/constant-time.test.ts` (new).
- **Acceptance criteria:**
  - `constantTimeEqual` exists exactly once in the codebase.
  - All 3 call sites import from `@open-care/vault-core`.
  - Tests prove identical behavior (equal strings → true, different
    strings → false, different lengths → false, timing-independent).
- **Verification:** `pnpm run check`, `pnpm exec vitest run`.

#### Slice 1.3: Extract shared `errorResponse` builder, add `request_id` everywhere (P2)

- **Scope:** Create canonical `errorResponse(code, message, details?,
  requestId?)` in `packages/vault-core/src/lib/errors.ts`. Replace all
  5 local implementations. Add `request_id` generation to every error
  response path in all 6 Workers. Add tests verifying every Worker's
  error responses include `request_id` and match the canonical shape.
- **Files:** `packages/vault-core/src/lib/errors.ts` (new),
  `apps/api-read/src/lib/errors.ts`, `apps/api-write/src/lib/errors.ts`,
  `apps/ingest/src/lib/errors.ts`, `apps/operator/src/lib/errors.ts`,
  `apps/anchor-cron/src/lib/errors.ts`, `apps/tg-bot/src/lib/errors.ts`,
  test files in each app.
- **Acceptance criteria:**
  - `errorResponse` exists exactly once in the codebase.
  - All 6 Workers return `request_id` in every error response.
  - Error shape matches [`04-api.md`](../specs/04-api.md) §"Standard
    error response" exactly.
- **Verification:** `pnpm run check`, `pnpm exec vitest run`, `curl`
  each Worker's error endpoints.

---

## Epic 2: Shared API Contract Types

**Priority:** P1 (high leverage, prevents future P0-class bugs)
**Depends on:** None (can run in parallel with Epic 1, but Epic 1
should complete first so the contract captures the fixed error shapes)
**Risk:** Low — pure type package, no runtime impact

### Goal

Create `@open-care/api-contract` as the single source of truth for all
API type shapes. Eliminate systematic type duplication between frontend
and backend. Make it impossible for a backend Worker to return a
non-compliant shape without a type error.

### Slices

#### Slice 2.1: Create `@open-care/api-contract` package

- **Scope:** Create `packages/api-contract/` with `package.json`,
  `tsconfig.json`, and TypeScript interface files for all 12+ type
  families: totals response, donations response, disbursements
  response, ledger-events response, verify response, health response,
  error response, disbursements request, corrections request,
  anchor/manual request, pending-requests response, send-code
  request/response. No runtime dependencies. Export only type
  definitions.
- **Files:** `packages/api-contract/package.json` (new),
  `packages/api-contract/tsconfig.json` (new),
  `packages/api-contract/src/*.ts` (new),
  `packages/api-contract/AGENTS.md` (new).
- **Acceptance criteria:**
  - Package builds with `tsc -b`.
  - All 12+ type families have interface definitions.
  - Package has zero runtime dependencies (no Zod, no Valibot).
  - `AGENTS.md` documents the contract and usage rules.
- **Verification:** `pnpm run check` includes the new package.

#### Slice 2.2: Migrate backend route handlers to use shared types

- **Scope:** Pick one Worker (recommend `vault-api-read` as it has the
  most public response types) and migrate its route handlers to import
  response types from `@open-care/api-contract`. Add `satisfies` checks
  or `expectTypeOf` tests verifying Zod-inferred types are assignable
  to contract types. Prove the pattern works, then document the
  migration path for remaining Workers.
- **Files:** `apps/api-read/src/routes/*.ts`,
  `apps/api-read/test/contract-compliance.test.ts` (new).
- **Acceptance criteria:**
  - At least one backend Worker's response types are imported from
    `@open-care/api-contract`.
  - A contract compliance test exists and passes.
  - Remaining Workers have a documented migration path.
- **Verification:** `pnpm run check`, `pnpm exec vitest run --filter api-read`.

#### Slice 2.3: Migrate frontend Valibot schemas to reference shared types

- **Scope:** Update `apps/web` Valibot schemas to import TS types from
  `@open-care/api-contract` and use them as type annotations. Keep
  Valibot for runtime validation. Add `satisfies` checks where
  practical.
- **Files:** `apps/web/src/lib/schemas/*.ts`,
  `apps/web/src/lib/api-types.ts` (may be simplified/replaced).
- **Acceptance criteria:**
  - Frontend type definitions for API shapes are imported from
    `@open-care/api-contract`, not locally defined.
  - Valibot schemas still provide runtime validation.
  - `pnpm run check` passes for `apps/web`.
- **Verification:** `pnpm run check`, manual inspection of frontend
  type imports.

#### Slice 2.4: Add contract compliance tests

- **Scope:** Add type-level tests (using `expectTypeOf` from vitest or
  explicit `satisfies` checks) that verify:
  - Every backend response builder returns a shape assignable to the
    contract type.
  - Every frontend type consumer expects a shape assignable from the
    contract type.
  - The error response contract is satisfied by all Workers.
- **Files:** Test files in each app and/or a shared
  `packages/api-contract/test/compliance.test.ts`.
- **Acceptance criteria:**
  - At least one compliance test per type family.
  - Tests fail if a backend response shape diverges from the contract.
- **Verification:** `pnpm exec vitest run`.

---

## Epic 3: Close Critical Test Gaps

**Priority:** P1 (proves fixes work, closes highest-risk untested paths)
**Depends on:** Epic 1 (tests should verify the fixed code)
**Risk:** Low — additive only, no production code changes

### Goal

Add tests for the 5 critical untested error paths identified in the
review. Each represents a real bug risk that could break invariants
I-4, I-7, I-9, or I-10.

### Slices

#### Slice 3.1: Solana RPC failure path tests

- **Scope:** Add tests in `apps/ingest/test/` for:
  - `fetchTransaction` returns `null` (NOT_FINALIZED) → no donation
    event appended.
  - `fetchTransaction` throws network error → graceful handling, no
    crash.
  - `fetchTransaction` returns malformed JSON → rejection, no append.
- **Files:** `apps/ingest/test/inbox.test.ts` (add test cases).
- **Acceptance criteria:**
  - All 3 failure scenarios have passing tests.
  - Tests use mocked `Connection` or controlled RPC responses.
- **Verification:** `pnpm exec vitest run --filter ingest`.

#### Slice 3.2: Anchor-cron failure path tests

- **Scope:** Add tests in `apps/anchor-cron/test/` for:
  - `createKeypair` throws → `status='failed'`, no ledger event.
  - `sendMemoTransaction` fails → `status='failed'`, no ledger event.
  - `appendLedgerEvent` fails after successful on-chain tx → recovery
    path appends backfill event with correct `created_at_utc`.
- **Files:** `apps/anchor-cron/test/anchor.test.ts` (add test cases).
- **Acceptance criteria:**
  - All 3 failure scenarios have passing tests.
  - Recovery path test verifies `created_at_utc` equals on-chain block
    time.
- **Verification:** `pnpm exec vitest run --filter anchor-cron`.

#### Slice 3.3: Log redaction tests

- **Scope:** Add tests in `apps/tg-bot/test/` and
  `apps/operator/test/` that capture log output and assert absence of:
  - Plaintext Telegram user IDs.
  - Plaintext Telegram chat IDs.
  - Gift-card codes.
  - `OPERATOR_TOKEN` or other secrets.
- **Files:** `apps/tg-bot/test/log-redaction.test.ts` (new),
  `apps/operator/test/log-redaction.test.ts` (new).
- **Acceptance criteria:**
  - Log capture mechanism works (mock or interceptor).
  - Tests fail if any sensitive pattern appears in logs.
  - Covers registration, request, delivery, and operator internal
    endpoints.
- **Verification:** `pnpm exec vitest run --filter "tg-bot|operator"`.

#### Slice 3.4: bot-db schema introspection test

- **Scope:** Add test that introspects `bot-db` schema and asserts:
  - No `telegram_user_id` column (plaintext).
  - No `telegram_chat_id` column (plaintext).
  - No standalone `chat_id` column.
  - `telegram_chat_id_enc` exists (encrypted).
  - `telegram_user_ref` exists (HMAC).
- **Files:** `apps/tg-bot/test/schema-denylist.test.ts` (new).
- **Acceptance criteria:**
  - Test fails if a migration adds a plaintext Telegram column.
  - Test passes against current schema.
- **Verification:** `pnpm exec vitest run --filter tg-bot`.

#### Slice 3.5: Frontend token state and admin page tests

- **Scope:**
  - Unit test: operator token is memory-only, cleared on unload.
  - Playwright test: `/admin` without token → auth prompt.
  - Playwright test: `/admin` with valid token → admin content.
  - Playwright test: `/admin` with invalid token → error, token
    cleared.
- **Files:** `apps/web/test/token-state.test.ts` (new),
  `apps/web/test/admin.test.ts` (new or add to existing Playwright
  tests).
- **Acceptance criteria:**
  - Token never persisted to `localStorage`, `sessionStorage`, or
    cookies.
  - Admin page behaves correctly for all 3 auth states.
- **Verification:** `pnpm exec vitest run --filter web`,
  `pnpm exec playwright test`.

---

## Epic 4: Testing Layer Build-Out (Levels 5–8)

**Priority:** P2 (higher investment, depends on solid base from Epics
1–3)
**Depends on:** Epic 1, Epic 3 (solid unit/integration base needed
before building higher-fidelity tests)
**Risk:** Medium-High — new infrastructure (local validator, Telethon),
external service dependencies

### Goal

Build out testing layers 5–8 from
[`08-testing-strategy.md`](../specs/08-testing-strategy.md): local-validator
blockchain tests, devnet live smoke, Helius webhook contract tests, and
Telegram E2E tests. All gated behind environment flags; none run in
normal PR CI.

### Slices

#### Slice 4.1: Local-validator blockchain test infrastructure

- **Scope:** Create `solana-test-validator` orchestration scripts,
  local keypair/mint/ATA fixtures, and test utility helpers. Add
  `blockchain:local-validator` script to `package.json`. Document
  setup in [`DEVELOPMENT.md`](../../DEVELOPMENT.md).
- **Files:** `tools/localnet/` (new directory),
  `package.json` (add script),
  `packages/vault-core/test/fixtures/local-validator.ts` (new),
  [`DEVELOPMENT.md`](../../DEVELOPMENT.md) (update).
- **Acceptance criteria:**
  - `pnpm run blockchain:local-validator` starts a validator, creates
    fixtures, and tears down.
  - Fixture helpers can create keypairs, mint SPL tokens, create ATAs,
    send transfers, and send Memo transactions.
  - Setup documented in [`DEVELOPMENT.md`](../../DEVELOPMENT.md).
- **Verification:** Run `solana-test-validator` manually, verify
  fixture creation.

#### Slice 4.2: Local-validator blockchain tests

- **Scope:** Add vitest tests using the local validator:
  - Real Memo transaction (create, send, fetch, verify UTF-8).
  - Real SPL Token transfer (send, fetch, parse, verify
    amount/mint/destination).
  - Vault ATA filtering (wrong ATA → reject).
  - Duplicate-safe ledger append.
  - Hash-chain verification with real on-chain data.
- **Files:** `apps/ingest/test/local-validator.test.ts` (new),
  `apps/anchor-cron/test/local-validator.test.ts` (new),
  `packages/vault-core/test/local-validator.test.ts` (new).
- **Acceptance criteria:**
  - At least 3 real-blockchain tests pass against local validator.
  - Tests are skipped (not failed) when validator is unavailable.
  - Skip reason is clear in test output.
- **Verification:** `pnpm run blockchain:local-validator && pnpm exec vitest run`.

#### Slice 4.3: Devnet live smoke test scripts

- **Scope:** Write a script using configured env vars
  (`SOLANA_CLUSTER=devnet`, `HELIUS_RPC_URL`, devnet wallet/ATA) that:
  - Sends a real Memo anchor on devnet.
  - Sends a tiny USDC transfer to devnet vault ATA.
  - Fetches and verifies both transactions.
  - Tests RPC null-before-finality retry.
- **Files:** `tools/devnet-smoke/` (new directory).
- **Acceptance criteria:**
  - Script exists and is documented.
  - Script is gated behind `ALLOW_DEVNET_SMOKE=true`.
  - Script can be run manually by an operator.
- **Verification:** Manual run with `ALLOW_DEVNET_SMOKE=true`.

#### Slice 4.4: Helius webhook contract test scripts

- **Scope:** Write a script that sends real/simulated Helius webhook
  payloads to staging ingest endpoint and verifies:
  - `Authorization` header extraction and constant-time comparison.
  - ACK-fast behavior (~1 second response).
  - Duplicate replay handling.
  - Payload shape validation.
- **Files:** `tools/helius-contract-test/` (new directory).
- **Acceptance criteria:**
  - Script exists and is documented.
  - Script is gated behind environment flags.
  - Script can be run manually.
- **Verification:** Manual run against staging.

#### Slice 4.5: Telegram E2E test suite

- **Scope:** Write pytest test files using Telethon `Conversation` API:
  - `/start <handle>` → registration, welcome reply.
  - `/card` → pending request, visible via internal endpoint.
  - Delivery → test user receives message.
  - No plaintext Telegram IDs in responses.
  - No full codes retained after delivery.
  - Duplicate `/start` and invalid commands handled.
- **Files:** `apps/tg-bot/test/e2e/` or `tools/e2e-tg/tests/` (new).
- **Acceptance criteria:**
  - At least 5 Telethon test cases pass against staging bot.
  - `sequential_updates=True` for deterministic ordering.
  - `asyncio.sleep(1)` between cases for rate limiting.
  - Tests are manual/nightly only, not PR CI.
- **Verification:** `pytest apps/tg-bot/test/e2e/ -v`.

---

## Epic 5: Code Quality Hardening (P3–P8)

**Priority:** P2 (lower risk, mostly additive)
**Depends on:** Epic 1 (P5 `request_id` is addressed there), Epic 2
(Zod schemas benefit from shared types)
**Risk:** Low-Medium — Zod validation may reject previously accepted
payloads

### Goal

Close the 6 lower-priority code quality issues: unvalidated external
payloads, missing tsconfig strictness, duplicated time utilities, and
vulnerable dev dependencies.

### Slices

#### Slice 5.1: Add Zod schemas for external payloads (P3, P4)

- **Scope:** Create Zod schemas for Helius webhook payloads and Solana
  RPC responses in `packages/vault-core/src/schemas/`. Replace `as`
  casts in `apps/ingest/src/lib/solana-rpc.ts` with `.safeParse()`.
  Add Zod validation in webhook route. Add tests for
  invalid/malformed payload rejection.
- **Files:** `packages/vault-core/src/schemas/helius.ts` (new),
  `packages/vault-core/src/schemas/solana-rpc.ts` (new),
  `apps/ingest/src/lib/solana-rpc.ts`,
  `apps/ingest/src/routes/webhook.ts`,
  test files.
- **Acceptance criteria:**
  - Helius webhook payloads validated at boundary.
  - Solana RPC responses validated at boundary.
  - Zero `as` casts on external data in ingest.
  - Invalid payloads rejected with clear validation errors.
- **Verification:** `pnpm run check`, `pnpm exec vitest run --filter ingest`.

#### Slice 5.2: Fix apps/web tsconfig (P6)

- **Scope:** Add `noUncheckedIndexedAccess: true` and
  `noUnusedLocals: true` to `apps/web/tsconfig.json`. Fix resulting
  type errors.
- **Files:** `apps/web/tsconfig.json`, various `apps/web/src/**/*.ts`
  files with type errors.
- **Acceptance criteria:**
  - `pnpm run check` passes for `apps/web` with new strictness flags.
  - Zero unchecked indexed accesses.
  - Zero unused locals.
- **Verification:** `pnpm run check`.

#### Slice 5.3: Extract utcNow/nowIso to vault-core (P7)

- **Scope:** Create `utcNow()` in
  `packages/vault-core/src/lib/time.ts`. Replace all 6 local copies
  with imports. Add format validation test.
- **Files:** `packages/vault-core/src/lib/time.ts` (new),
  `apps/ingest/src/lib/time.ts`, `apps/api-write/src/lib/time.ts`,
  `apps/anchor-cron/src/lib/time.ts`, `apps/tg-bot/src/lib/time.ts`,
  `packages/vault-core/test/time.test.ts` (new).
- **Acceptance criteria:**
  - `utcNow`/`nowIso` exists exactly once in the codebase.
  - Output matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`.
- **Verification:** `pnpm run check`, `pnpm exec vitest run`.

#### Slice 5.4: Dependency audit cleanup (P8)

- **Scope:** Run `pnpm audit`, update vulnerable transitive dev deps,
  remove unused `@solana/spl-token` if confirmed unused.
- **Files:** `pnpm-lock.yaml`, `package.json` files.
- **Acceptance criteria:**
  - `pnpm audit` shows zero vulnerabilities (or remaining documented).
  - `pnpm run check && pnpm run lint && pnpm exec vitest run` passes.
- **Verification:** `pnpm audit`, `pnpm run check`, `pnpm exec vitest run`.

---

## Epic 6: Environment Polish

**Priority:** P3 (cosmetic, no invariants affected)
**Depends on:** None (fully independent)
**Risk:** Low — config-only changes, each slice reversible

### Goal

Close the 4 minor environment issues: missing `DEPLOY_VERSION`,
non-idempotent seed script, unused wrangler vars, and unwired
`CONTACT_URL`.

### Slices

#### Slice 6.1: Add DEPLOY_VERSION to api-read wrangler.jsonc

- **Scope:** Add `DEPLOY_VERSION` to `vars` in
  `apps/api-read/wrangler.jsonc`.
- **Files:** `apps/api-read/wrangler.jsonc`.
- **Acceptance criteria:**
  - `DEPLOY_VERSION` appears in `vars` block.
  - `/api/health` returns the version (if it reads this var).
- **Verification:** `curl https://staging.open-care.org/api/health`
  after deploy.

#### Slice 6.2: Make seed script idempotent

- **Scope:** Modify seed script to use `INSERT OR IGNORE` or
  existence checks. Running twice must succeed without errors or
  duplicates.
- **Files:** Seed script (locate via `package.json` scripts or
  `tools/`).
- **Acceptance criteria:**
  - Seed script runs twice without error.
  - No duplicate data after second run.
- **Verification:** Run seed script twice against local D1.

#### Slice 6.3: Clean up unused vars in tg-bot wrangler.jsonc

- **Scope:** Audit 6 unused vars in `apps/tg-bot/wrangler.jsonc`.
  Remove confirmed unused. Document intentionally kept vars.
- **Files:** `apps/tg-bot/wrangler.jsonc`.
- **Acceptance criteria:**
  - No unused vars remain (or remaining are documented).
  - Deploy still works.
- **Verification:** `wrangler deploy --dry-run` or staging deploy.

#### Slice 6.4: Wire CONTACT_URL or remove from docs

- **Scope:** Add `CONTACT_URL` as a `vars` entry in
  `apps/api-read/wrangler.jsonc`. Include it in `/api/health`
  response under `contact_url` field. Update spec docs if needed.
- **Files:** `apps/api-read/wrangler.jsonc`,
  `apps/api-read/src/routes/health.ts`.
- **Acceptance criteria:**
  - `/api/health` returns `contact_url` field.
  - `CONTACT_URL` is configurable via wrangler vars.
- **Verification:** `curl https://staging.open-care.org/api/health`
  after deploy.

---

## Dependency Graph

```text
Epic 1 (P0–P2 fixes) ─────────────────────┐
                                            │
Epic 2 (API contract types) ────────────────┤ (can start after Epic 1)
                                            │
Epic 3 (Critical test gaps) ────────────────┤ (depends on Epic 1)
                                            │
Epic 4 (Testing layer build-out) ───────────┤ (depends on Epics 1, 3)
                                            │
Epic 5 (Code quality hardening) ────────────┤ (depends on Epics 1, 2)
                                            │
Epic 6 (Environment polish) ────────────────┘ (independent)
```

## Summary

| Epic | Priority | Slices | Risk |
|------|----------|--------|------|
| 1: Fix Critical Code Defects | P0 | 3 | Medium |
| 2: Shared API Contract Types | P1 | 4 | Low |
| 3: Close Critical Test Gaps | P1 | 5 | Low |
| 4: Testing Layer Build-Out | P2 | 5 | Medium-High |
| 5: Code Quality Hardening | P2 | 4 | Low-Medium |
| 6: Environment Polish | P3 | 4 | Low |
