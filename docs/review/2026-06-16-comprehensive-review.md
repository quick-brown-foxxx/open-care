# Comprehensive High-Level Review — `crypto-charity`

**Date:** 2026-06-16
**Scope:** Every doc, every spec, every config, every line of code currently in the repo.
**Audience:** Project owner, future AI agents, and reviewers.
**Status:** Pre-implementation. No code beyond two mock Workers.

This is not a rewrite. It is a structured judgment of the design as it stands:
what is right, what is broken, what is missing, and what should change before
real code is written. Every finding cites the source file and section.

## TL;DR

The design is **largely right and unusually well-considered for a
pre-implementation stage**. The trust model is honest, the threat model is
explicit about its limits, the spec is dense and internally consistent on most
points, and the secret inventory is the kind of artifact that prevents a class
of whole categories of incidents.

There are, however, **two critical issues that can invalidate the trust story**
if not resolved before launch, and roughly fifteen high-severity issues that
will block, distort, or render-inconsistent the implementation if the spec is
read at face value.

| Bucket | Count | Examples |
| --- | --- | --- |
| **Critical** (would invalidate trust story) | 2 | `correction_recorded` is a silent history rewrite; anchor crash window is undefined |
| **High** (block/distort implementation) | ~15 | Solana SDK v1 vs v2 conflict; `donation_confirmed` missing transfer index; `verify.ts` referenced but missing; `/api/health.anchor_wallet_low_sol` has no query path; `balance_usdc_minor` mislabels "ledger balance" as "balance" |
| **Medium** (quality / robustness) | ~12 | Canonical JSON under-specified; anchor cron/manual race; `service_note` 3-state ambiguity; binding allowlist documented but not enforced |
| **Low** (polish / clarity) | ~8 | Pages project name typo; H3 page title encoding; clock skew tolerance; `landing.html` vs implementation relationship |
| **Working well** | 8+ | AAD design, treasury key custody, BDD scenario density, secret inventory, threat-model honesty |

**Recommended pre-implementation priorities:**

1. **Resolve A4** (`correction_recorded` semantics) — the public API must
   answer the question "what is the current value of a corrected field?"
2. **Resolve B1** (anchor crash recovery) — what happens to an on-chain memo
   that has no matching ledger event? Without an answer, the recovery path can
   create the very inconsistency the trust story exists to prevent.
3. **Resolve G4** (Solana SDK version) — spec says v2, lockfile has v1.
   Pick one. Updating the lockfile to v2 is probably right; v1 is in
   maintenance mode and the `@solana/spl-token` v1 has a different shape.
4. **Resolve the read-worker / anchor-balance path** (H6) — the read API
   exposes a value that no defined runtime can compute.
5. **Fix the cross-DB link between disbursement and conversation** (D3) —
   the spec is silent on how an operator (or a verifier) can tie a public
   disbursement to a private bot delivery.

Everything else can be fixed in the normal implementation loop.

---

## What the design gets right

These are not throwaway. They should be preserved in any rewrite.

- **Wallet split is principled.** Treasury has no private key in CI/Workers.
  Anchor holds only SOL for fees. The compromise blast radius is bounded.
  [`01-architecture.md:122-131`], [`06-security-model.md:28-36`].
- **Append-only `ledger_events` is the right shape.** One canonical source
  of truth, payload-committing hash, optional read-model tables. No typed
  table can drift from the chain.
  [`02-invariants.md:18-49`], [`03-data-model.md:28-102`].
- **Bot identity storage design is correct.** `telegram_user_ref` HMAC,
  `telegram_chat_id_enc` AES-GCM with AAD bound to `opaque_id` and key
  version. A `bot-db`-only leak does not expose plaintext Telegram IDs.
  [`03-data-model.md:308-364`], [`02-invariants.md:115-148`].
- **Threat model is honest.** The spec says it does not protect against
  state-adversary-grade deanonymization, Telegram provider data, or Cloudflare
  account compromise. This is the right level of honesty for an MVP.
  [`06-security-model.md:86-92`, `186-196`].
- **Helius webhook auth and durable inbox are correct.** Exact `Authorization`
  comparison, ACK-fast with durable inbox, async processing, duplicate-safe
  by signature, finalized-commitment fetch. The mock Worker already does the
  auth check. [`04-api.md:375-431`], [`apps/ingest/src/index.ts:9-21`].
- **Public redaction denylist is explicit.** Telegram IDs, internal handles,
  donor memos, full gift-card codes — all named, all banned. Six different
  spec files repeat the same denylist, which is exactly the right amount of
  repetition.
- **Secret inventory is exemplary.** The `docs/ops/secrets-inventory.md`
  document is the model for the rest of the project: one source of truth for
  what is deployed, who owns rotation, where it lives.
- **BDD scenarios are concrete and tiered.** The 13 scenarios in
  [`08-testing-strategy.md:91-345`] cover most of the trust properties and
  the testing strategy is tiered correctly (unit → integration → public
  verification → browser → local-validator → devnet → mainnet).

---

## Critical issues (must be resolved before any code is written)

### C1. `correction_recorded` is a silent history rewrite

**Severity:** critical
**Files:** [`docs/specs/03-data-model.md:198-212`], [`docs/specs/02-invariants.md:43-67`]

Invariant I-1 says no `UPDATE`/`DELETE` on `ledger_events`. The
`correction_recorded` event respects that — it appends a new row. But the
spec does not define the **semantic** meaning of a correction for the public
API and for the donor verifier:

- What fields can a correction change? The example only shows
  `receipt_ref`, but nothing forbids correcting `amount_usdc_minor` or
  `gift_card_count`. An operator could "correct" a $500 disbursement to a
  $5,000 one and append an event that just says "see replacement_fields".
- When the public `/api/disbursements` returns a corrected disbursement,
  does it return the **original** payload (matching the on-chain hash
  chain), the **post-correction** value (matching the operator's view), or
  both side-by-side?
- A donor who runs the verify script gets the original event from
  `ledger_events` directly (correct, verifiable). But the same donor who
  uses the public `/api/disbursements` JSON gets a different value. The two
  views can be inconsistent in a way that no automated test detects.

**Likely fix.** Pick one of:

1. **Restrict corrections.** Corrections are only allowed for free-text
   fields (`receipt_ref`, `service_note`). `amount_usdc_minor`,
   `gift_card_count`, `purchase date` are immutable; an operator mistake
   there requires reversing the disbursement via a new `disbursement_recorded`
   with a negative amount or a structured "reversal" event type.
2. **Bivalent public API.** `/api/disbursements` returns the original event
   payload verbatim from `ledger_events`. A separate
   `?include=corrections` query parameter returns the correction chain. The
   verify script and the public read API agree by construction.
3. **Defer corrections entirely.** Document that MVP has no correction flow;
   if a mistake is made, the operator either (a) records a compensating
   `disbursement_recorded` with a negative amount, or (b) documents the
   error in `/contact` and the next anchor. Add `correction_recorded` in
   Phase 2 with a real spec.

Option 1 or 3 is recommended. Option 2 is implementable but is a real product
decision, not a spec detail.

### C2. Anchor crash window is undefined

**Severity:** critical
**Files:** [`docs/specs/01-architecture.md:177-189`], [`docs/specs/02-invariants.md:86-101`], [`docs/specs/05-hosting-and-deploy.md:155-169`]

The anchor flow is: (1) read head, (2) build memo, (3) sign & send tx, (4)
fetch at finalized, (5) append `anchor_published` event. Steps 4 and 5 are
not atomic. If the Worker crashes between 4 and 5:

- The Solana transaction is on-chain with `memo_text: ccv-anchor:<head_H>`.
- No `anchor_published` event exists for head H.
- The next anchor run (next day or operator-triggered) sends a NEW tx
  committing to a new head — which still includes the unanchored events
  from the day of the crash. So now we have two on-chain memos, both
  pointing to different heads. The earlier one is orphaned; a donor
  verifier can find the earlier memo on-chain but cannot reconcile it with
  any `anchor_published` event in the chain.
- If the recovery path appends a new `anchor_published` event retroactively,
  the `created_at_utc` and the on-chain `published_at_utc` diverge; the
  hash preimage of the recovered event is different from what would have
  been appended at the time of the tx. The chain is still valid, but the
  ordering becomes suspect.

**Likely fix.** Document the recovery path explicitly:

- On Worker startup or cron tick, scan `anchor_runs` for rows with
  `status='sending'` older than, say, the Solana slot finality window
  (12-15s × N).
- For each, look up the tx by `tx_signature` on-chain. If finalized:
  - Append `anchor_published` with `published_at_utc` set to the **on-chain
    block time** (not "now"), so the hash preimage is what it would have
    been at the time of the tx.
  - Update `anchor_runs` to `status='published'`.
- If the tx exists but is not finalized: leave `status='sending'`, retry on
  the next cron tick.
- If the tx does not exist (e.g., dropped): mark `status='failed'`, the
  cron/manual path re-attempts with the same head.

This must be tested. Add a BDD scenario: "Given an anchor tx was finalized
but the anchor_published event was not appended, When the cron runs again,
Then a backfill event is appended with `published_at_utc` equal to the
on-chain block time."

---

## High-severity issues (block or distort implementation)

These are real issues that will produce broken code, broken UX, or broken
trust claims if the spec is taken literally. They are listed in the order
in which they should be resolved (highest trust impact first).

### H1. Solana SDK version conflict (v1 vs v2)

**Severity:** high
**Files:** [`docs/specs/01-architecture.md:118`] (says v2), [`docs/specs/05-hosting-and-deploy.md:118`], root [`package.json:11-12`] (v1.98.4), `node_modules/@solana/web3.js/package.json` (1.98.4), `node_modules/@solana/spl-token/package.json` (0.4.14)

The spec says use `@solana/web3.js` v2. The lockfile has v1. v1 and v2 have
**incompatible APIs**:

- v1: `new Connection(url)`, `connection.getTransaction(sig, opts)`.
- v2: `createSolanaRpc(url)`, `rpc.getTransaction(sig).send()`.

Any agent that reads the spec and writes `import { Connection } from '@solana/web3.js'`
will get the v1 type signatures and the v1 runtime — the code will compile,
but it contradicts the documented decision. The clean fix is to update the
lockfile to v2 (recommended; v1 is in maintenance mode), or to amend the spec
to say v1.

**Likely fix.** Update the root `package.json` to `@solana/web3@^2` and
`@solana/spl-token@^0.4` (the same major for spl-token is fine, but verify
the API surface in v2 is compatible). Run `pnpm install`. Add a CI check
that the installed version is in the expected set.

### H2. `donation_confirmed` payload is too thin to be verifiable

**Severity:** high
**Files:** [`docs/specs/03-data-model.md:131-142`]

The payload commits to: `cluster`, `usdc_mint`, `treasury_wallet_address`,
`vault_usdc_ata`, `tx_signature`, `slot`, `block_time_utc`, `amount_usdc_minor`.

What's missing for unambiguous verification:

- **`instruction_index` / `inner_index`**: a single Solana transaction can
  contain many SPL token transfers. If the same `tx_signature` has two
  transfers into the vault USDC ATA (real scenario: a multi-step wallet
  UX, a sandwiched payment, or an exploit that reuses a tx), the spec
  cannot identify which transfer produced this event. Two writers picking
  the same tx could assert different amounts.
- **`transaction_version`**: the spec mandates
  `maxSupportedTransactionVersion: 0` for parsing, but the payload does not
  record which version was parsed. A future v1 transaction format would
  parse the same tx bytes differently.
- **Source token account / fee payer** (optional, privacy-balanced): a
  donor who wants to "prove this donation is mine" has nothing to
  commit to. A `donor_token_account_hash` (HMAC of the source token
  account, key kept private to the donor) would let donors opt in to
  proving provenance without exposing their wallet.

**Likely fix.** Add `instruction_index: integer` and
`transaction_version: integer` to the payload. The donor-source field is
optional and can be deferred.

### H3. `/api/totals.balance_usdc_minor` is misleadingly named

**Severity:** high
**Files:** [`docs/specs/04-api.md:87-107`]

The field is computed as `sum(donation_confirmed) - sum(disbursement_recorded)`.
This is **not** the on-chain balance. The on-chain ATA balance can differ
because of: missed webhooks (ingest lag), manual treasury operations
(operator transferred funds out of band), airdrops to the treasury wallet,
or a seed funding not in the ledger. A donor who sees "balance:
1,000,000,000 USDC" assumes the vault holds 1,000 USDC. It may not.

This is a **misleading trust claim** in a product whose value is trust.

**Likely fix.** Either:

1. Rename to `computed_balance_usdc_minor` and document: "Computed from
   ledger events; may differ from on-chain ATA balance. See
   `/api/ata-balance` for the on-chain value."
2. Add a separate `/api/ata-balance` endpoint that queries the on-chain
   balance via RPC and surfaces any discrepancy. Requires the read API
   worker to have an RPC secret (currently it doesn't — see H6).

The first option is cheaper and more honest for an MVP.

### H4. `/api/health.anchor_wallet_low_sol` has no defined query path

**Severity:** high
**Files:** [`docs/specs/04-api.md:280-289`], [`docs/specs/07-observability-and-ops.md:24`], [`apps/api-read/wrangler.jsonc:5-15`]

The `/api/health` endpoint reports `anchor_wallet_low_sol: boolean`. To
compute this, the worker must query the anchor wallet's SOL balance via
RPC. But the `vault-api-read` worker has only the `vault_db` binding — no
`HELIUS_RPC_URL` secret, no other RPC binding. The `wallets` table stores
metadata, not live balance. The `anchor_runs` table stores run state, not
balance. The cron worker has `HELIUS_RPC_URL` but is a separate Worker
with no shared query interface.

The field is reported in three places (totals, verify, health) and none
has a defined mechanism to compute it.

**Likely fix.** Have `vault-anchor-cron` write the anchor wallet's balance
to a small `wallet_health` table (or extend `anchor_runs.last_anchor_wallet_sol_lamports`)
on each anchor attempt. The read API reads from D1. No new secrets
needed on the read worker.

### H5. Canonical JSON rule is too underspecified to prevent divergence

**Severity:** high
**Files:** [`docs/specs/03-data-model.md:73-82`]

The spec mandates: keys sorted lexicographically, UTF-8 strings, integer
minor-unit strings (no floats), null for nullable. What's missing:

- **No pinned standard.** RFC 8785 (JCS — JSON Canonicalization Scheme) is
  the de facto standard; some implementers use a custom scheme with
  different number-handling, Unicode normalization, or whitespace rules.
- **No precision rule for `created_at_utc`.** "ISO-8601 UTC with Z" can
  mean second precision (`2026-06-14T10:23:00Z`) or millisecond
  (`2026-06-14T10:23:00.000Z`). Different precisions produce different
  hashes. Pin the precision.
- **No array ordering rule.** If a future event has arrays (e.g. a
  multi-transfer USDC donation with two transfers in one tx — see H2),
  the order matters for the hash. The spec is silent.
- **No number-string validation.** `"100000000"` vs `"100000000 "` (trailing
  space) vs Unicode digits produce different bytes and different hashes.
  The spec says "integer minor-unit strings" but doesn't pin the format.
- **No cross-implementation test.** A donor who writes their own verifier
  in Python or Rust can produce a different hash. The FAQ says "donors can
  recompute the chain" but does not say "and we publish a normative test
  vector".

**Likely fix.** Pin to RFC 8785 (JCS), and add a normative test vector in
`docs/specs/03-data-model.md` (a fixed event, the expected canonical
bytes, the expected hash). Add a BDD scenario: "Donor runs their own
verifier in any language and gets the same head hash." Adopt a
"closed-schema" policy: no optional fields, only nullable ones.

### H6. `apps/web/scripts/verify.ts` referenced in API but does not exist

**Severity:** high
**Files:** [`docs/specs/04-api.md:209-214`], `apps/web/src/` (only an empty `src/`)

The `/api/verify` response tells donors:

```
"instructions": {
  "typescript": "npx tsx apps/web/scripts/verify.ts --api https://<host>"
}
```

The file does not exist. When donors try, they get a clear failure. This
breaks invariant I-9 ("Public verification can recompute the exact chain")
in the strongest sense: the verification tool the API tells donors to use
is not available.

**Likely fix.** Either (a) ship `verify.ts` as part of the MVP frontend
package, or (b) remove the `instructions.typescript` field from the
response until the script exists, replacing it with a GitHub URL or a
"coming soon" note.

### H7. `disbursement_recorded` payload lacks `opaque_id` — cross-DB link is fragile

**Severity:** high
**Files:** [`docs/specs/03-data-model.md:155-178`], [`docs/specs/04-api.md:299-347`]

The bot stores the disbursement's `public_beneficiary_ref` in
`conversations.public_beneficiary_ref` after `send-code` succeeds. But
`send-code` takes `{opaque_id, conversation_id, code}` — **not** the
`public_beneficiary_ref`. So either:

- The bot must re-derive the ref by calling `vault-api-read`, which would
  require a `vault-db` binding on the bot (forbidden by the spec).
- The operator passes the ref from the disbursement response back into the
  bot call, but the spec doesn't say so.
- The bot looks up the most recent disbursement for this `opaque_id` via
  vault-db — again forbidden.

The spec describes the **outcome** (the conversation has the ref) but
not the **mechanism** to achieve it. This is a real cross-cutting design
hole.

Worse: even if the link is recorded, there is no way for an auditor to
trace a public disbursement to its bot delivery (or vice versa) without
inspecting the bot's internal memory.

**Likely fix.** Two options:

1. **Include `opaque_id` in the disbursement payload** (privacy-acceptable:
   `opaque_id` is not a Telegram ID, just an internal handle-row ID). The
   bot can validate that the operator's send-code call matches the recorded
   `opaque_id`. The disbursement's `public_beneficiary_ref` is the public
   link; the `opaque_id` is the internal link.
2. **Add a bot endpoint `POST /tg/internal/record-ref`** that the operator
   calls after a disbursement is recorded. The bot stores the ref in
   `conversations`. Document the full operator flow.

Option 2 is cleaner because it doesn't leak internal IDs into the
public ledger. The current `send-code` request body should be extended to
take an optional `public_beneficiary_ref` so the operator doesn't have to
make a second API call.

### H8. `helius_inbox.signature` PK cannot capture source provenance

**Severity:** high
**Files:** [`docs/specs/03-data-model.md:280-291`]

`signature TEXT PRIMARY KEY` plus `source IN ('webhook', 'reconciliation')`.
The same signature arriving from a webhook and from reconciliation cannot
both be inserted. The spec implies the row is upserted (the webhook handler
"inserts or finds" the row). The `source` column is therefore decorative
— it records the first path, not all paths.

This matters for two reasons: (1) observability (which path found each
donation?), (2) forensics (was this tx found by Helius first, or only by
reconciliation because Helius was down?).

**Likely fix.** Change PK to `(signature, source)` or `(signature, observed_at)`.
Reconciliation uses `INSERT OR IGNORE`; the first-observed path is recorded,
later observations are noted but not re-processed.

### H9. Concurrent anchor cron + manual can race on `event_hash`

**Severity:** high
**Files:** [`docs/specs/03-data-model.md:33-46`], [`docs/specs/03-data-model.md:248-274`], [`docs/specs/02-invariants.md:86-101`]

The `ledger_events.event_hash` is `UNIQUE`. If two anchor paths run
concurrently and both read the same head, both will:

1. Send a Solana transaction with `ccv-anchor:<head_H>`.
2. Wait for finalization.
3. Both try to insert an `anchor_published` event with `event_hash =
   SHA-256(...head_H, prev_hash=H, created_at_utc=...)`. If the
   `created_at_utc` resolution is seconds, the two hashes are **identical**
   and the second insert fails with a UNIQUE constraint violation.
4. Result: one anchor publishes on-chain (the second tx wastes SOL), one
   fails with a database error, and the operator sees a confusing error.

The `anchor_runs` table has a `UNIQUE (anchor_date, anchored_head_hash)`
index and a `locked_until_utc` field, which suggests the design intends
serialization. The spec doesn't say so explicitly.

**Likely fix.** Document: cron and manual anchor paths must serialize
per `(anchor_date, anchored_head_hash)`. The cron uses
`locked_until_utc` (e.g. now + 5 minutes) when starting; the manual path
checks for an active lock and returns `409 CONFLICT` with the in-flight
attempt's request ID. Add a BDD scenario.

### H10. `service_note` three-state ambiguity

**Severity:** high
**Files:** [`docs/specs/04-api.md:316-325`], [`docs/specs/03-data-model.md:159-168`]

The spec says `service_note` is "required only for `Other`, max 64
characters". The request example shows `service_note: null`. Three
questions, three different validations needed:

- `service="Alter"` + `service_note="<text>"` — should reject (operator
  trying to attach a note to a known service).
- `service="Other"` + `service_note=""` — empty string is not "missing",
  but is it valid? The spec says max 64 chars (no min), so empty string
  technically passes the max check. But "Other" requires a non-empty
  note by the spec's stated rule.
- `service="Other"` + `service_note` omitted vs `null` — semantically the
  same, but JSON-schema-wise different.

The `disbursement_recorded` payload stores `service_note: null`. The
disbursement table has no CHECK constraint on `service_note`. The bot's
`conversations.public_beneficiary_ref` has a CHECK (good), but
`service_note` does not (bad).

**Likely fix.** Specify exactly: "service_note must be a non-empty
string of 1..64 chars when service='Other'; must be null or omitted when
service is one of the named services." Add a CHECK constraint or Zod
schema with a refinement.

### H11. Binding allowlist documented but not enforced

**Severity:** high
**Files:** [`docs/specs/05-hosting-and-deploy.md:30`, `196`], [`docs/specs/02-invariants.md:138-145`], [`docs/specs/06-security-model.md:181`], [`docs/specs/09-decisions.md:141`], [`apps/*/wrangler.jsonc`]

The spec says the binding allowlist is "checked in CI". There is no CI
yet (`.github/workflows/` is empty per the inventory). The quarterly
audit in [`07-observability-and-ops.md:77-79`] lists this as a manual
check. So the rule that vault Workers must not have `bot-db` binding,
and the bot Worker must not have `vault-db` binding, is **policy, not
mechanism**. A future agent that adds a new Worker or refactors
bindings will not be caught.

The current state is correct: `vault-api-read`, `vault-api-write`,
`vault-ingest`, `vault-anchor-cron` have only `vault_db`; `tg-bot` has
only `bot_db`. But nothing prevents the next commit from breaking this.

**Likely fix.** Add a Vitest test (or custom script) in
`tools/check-bindings/` that parses all `apps/*/wrangler.jsonc` and
asserts:

- Workers with `vault_db` binding MUST NOT have `bot_db` binding.
- Workers with `bot_db` binding MUST NOT have `vault_db` binding.
- The Worker named `tg-bot` MUST have `bot_db` binding.
- The Workers named `vault-*` MUST have `vault_db` binding.

Make it a required CI check before `pnpm build` or `pnpm deploy`.

### H12. `balance_usdc_minor` claim is wrong about "balance"

**Severity:** high
**Files:** [`docs/specs/04-api.md:87-107`], [`docs/specs/07-observability-and-ops.md:24`]

The `totals` endpoint reports `balance_usdc_minor` as a single number
without any disclaimer that it is `in - out` from the ledger, not the
on-chain ATA balance. See H3 for the full analysis.

This is a misleading trust claim. Recommend fixing as in H3.

### H13. `disbursement_recorded.amount_usdc_minor` has no maximum

**Severity:** high
**Files:** [`docs/specs/04-api.md:316`], [`docs/specs/03-data-model.md:140`]

The spec says "positive integer minor-unit string" with no max. A
malicious or careless operator could type a 1000-digit string. JS
`parseInt` loses precision silently past `Number.MAX_SAFE_INTEGER`
(~9 × 10^15). For USDC (6 decimals), 10^15 minor units = $10^9 = $1B,
which is more than enough. Above that, the value is suspect.

The hashing in canonical JSON works on the string itself, so the hash is
fine. But API parsing, arithmetic in the totals endpoint, and any future
`BigInt` migration all depend on a sane range.

**Likely fix.** Specify a max (e.g., `amount_usdc_minor <= 10^15`),
validate as BigInt, return `422 VALIDATION_ERROR` for over-max. Add a
CHECK constraint at the DB level too.

### H14. Worker `wrangler`/runtime version drift

**Severity:** medium-high
**Files:** [`apps/ingest/package.json:13`], [`apps/tg-bot/package.json:13`], root [`package.json:12`]

`wrangler@^4` is in three places. `@cloudflare/workers-types` is in the
`tsconfig.types` of the two existing apps but is not in their
`package.json` dependencies — it must be hoisted from the root, which
isn't set up. This will silently break type checking once a real
`packages/vault-core/` is added.

**Likely fix.** Consolidate devDependencies at the root for shared
tooling (`wrangler`, `@cloudflare/workers-types`, `typescript`, etc.) and
keep apps thin. Add `engines` constraints. Verify with
`pnpm -r exec tsc --noEmit` after the layout is finalized.

### H15. Pages project name inconsistency

**Severity:** low
**Files:** [`docs/specs/05-hosting-and-deploy.md:36`] (`vault-web`),
[`docs/ops/secrets-inventory.md:116`] (`open-care-web`),
[`DEVELOPMENT.md:68`] (deploy uses `open-care-web`)

The spec says the Pages project is `vault-web`. The secrets inventory
and the documented deploy command both use `open-care-web`. The
inventory is the operational source of truth (the project is
deployed). The spec must be updated, or the deploy command will fail
with "project not found."

**Likely fix.** Update `05-hosting-and-deploy.md` to use `open-care-web`.

---

## Medium-severity issues

### M1. The "operator-triggered backup run" is described but not architectured

[`01-architecture.md:88-91`], [`04-api.md:348-374`], [`12-operator-frontend-ux.md:115-132`]

`POST /api/anchor/manual` is documented to "enqueue or run the same anchor
path used by the scheduled job". The architecture says it uses the same
`ANCHOR_WALLET_SECRET`, the same Memo format, and the same `anchor_runs`
state. The spec doesn't say whether the manual trigger and the cron job
share a **single implementation function** or two parallel implementations.
The risk is real: divergent code paths between scheduled and manual
anchoring is a classic source of "the cron works but manual doesn't" bugs.

**Likely fix.** State explicitly: `vault-anchor-cron` exports a single
`runAnchor(opts)` function. Both the cron trigger and the
`POST /api/anchor/manual` handler call the same function. Manual mode
sets `source='operator-manual'`; cron sets `source='cron'`. Both write
to `anchor_runs` with the same status transitions.

### M2. `vault-core` shared package's role is underspecified

[`01-architecture.md:99-104`], [`05-hosting-and-deploy.md:118`]

The spec names a `packages/vault-core/` that holds "TypeScript event
schemas, canonical JSON, hash-chain verification, Solana Memo builder,
and public verification logic." But:

- The same package is used by Workers (backend), by SvelteKit
  (frontend, for verification scripts), and by tools (e.g.
  `tools/anchor-job/`).
- Frontend should not import backend internals; backend should not
  import SvelteKit code. The package must be a pure types-and-logic
  library with no D1 / Hono / SvelteKit dependencies.
- The "TypeScript verify script" lives in `apps/web/scripts/verify.ts`
  per [`04-api.md:211`] but uses `packages/vault-core` for the actual
  hash recomputation. The package must therefore compile to a
  Node-and-Workers target (no DOM, no Node-only APIs).

**Likely fix.** Document the package's dependency surface: pure ESM,
no Cloudflare-specific imports, no SvelteKit, no `node:*` imports
unless behind a `nodejs_compat` flag. Add a `package.json` `exports`
map and an `imports`-style test that the package can be consumed by
both a Worker and a Node script.

### M3. Public verification cross-implementation story is not told

[`08-testing-strategy.md:23`], [`11-public-frontend-ux.md:124-139`]

The verify page tells donors to run a TypeScript script. The FAQ
should tell donors that **donors can write their own verifier in any
language and get the same hash** — that's the strongest trust claim.
This requires:

- A pinned canonicalization algorithm (see H5).
- A normative test vector (one event, expected canonical bytes,
  expected hash).
- A "trusted reproducibility" section in the FAQ with a worked
  example.

**Likely fix.** Once H5 is resolved, add a normative test vector and
a worked-example section in the FAQ.

### M4. `previous_anchors: []` in `/api/verify` should paginate

[`04-api.md:191-215`]

After 1 year of daily anchors, this list is 365 entries; after 5
years, 1825. The response grows unboundedly. JSON parsing in browsers
starts to suffer around 1MB. Latent bug.

**Likely fix.** Cursor-paginate. Return the most recent N (e.g., 30)
anchors by default with `next_anchor_cursor` for older.

### M5. `donation_confirmed` payload `block_time_utc` vs `slot` ordering

[`03-data-model.md:131-142`]

Both `slot` and `block_time_utc` are committed. A future Solana
re-organization (pathological finality edge case) could produce
different finalized blocks for the same slot. The `block_time_utc` is
the operator-observable time; `slot` is the chain-anchored ordering.
Both are correct to commit, but the spec doesn't say which to use for
sorting public `/api/donations`. Pick one and document.

**Likely fix.** Document: "Public read endpoints sort by `slot`
ascending; display time is `block_time_utc`."

### M6. Donation status page (`/donate/[donationRef]`) assumes wallet returns a signature

[`11-public-frontend-ux.md:77-89`]

The optional route polls for a `donation_confirmed` event by
transaction signature. The spec acknowledges "if implemented". But
many wallet integrations (Solana Pay URIs, browser wallet popups) do
not return a transaction signature — they return a status object or
nothing. The `donationRef` parameter shape (Solana transaction
signature) is too narrow.

**Likely fix.** Either commit to a single wallet-integration path
(Solana Pay URL with reference keys) or drop the optional route from
MVP. The current "ship if reliable" guidance is too vague for an
implementation team.

### M7. Anchor staleness threshold (36h) defined in observability doc but not API spec

[`07-observability-and-ops.md:24`], [`04-api.md:104-113`]

The `anchor_stale` flag has a 36-hour threshold in the observability
doc but no definition in the API spec. The `anchor_wallet_low_sol`
flag has no threshold at all. Frontend can't render a meaningful
"stale" label without knowing the threshold.

**Likely fix.** Move all health-check thresholds to a single location
or reference the observability doc explicitly from the API spec.

### M8. `landing.html` is a static prototype; the SvelteKit implementation is not yet specced for parity

[`docs/ui-prototypes/landing.html`], [`docs/ui-prototypes/landing.md`],
[`docs/specs/10-frontend-architecture.md`], [`docs/specs/11-public-frontend-ux.md`]

The 548-line HTML prototype is Russian-first, hard-codes content, and
uses custom CSS variables. The architecture spec is a different
artifact. There is no statement that "the implementation must mirror
the prototype's section structure and Russian copy" or "the
prototype is reference only." Either is fine, but the relationship
needs to be pinned.

**Likely fix.** Add a short note at the top of `landing.md`:
"The prototype is reference-only for visual direction. The
SvelteKit implementation reuses the structural sections (hero, metrics,
recent feed, how-it-works, privacy promise, honest proof, report
path) and the Russian copy, but rebuilds the layout using Bits UI
primitives."

### M9. `bot-db` correlation deanonymization risk is not analyzed

[`06-security-model.md:51-61`]

A `bot-db`-only leak exposes: `handle` (a human-readable pseudonymous
string the beneficiary chose), `first_seen_utc`, `last_seen_utc`,
`opaque_id`, `telegram_user_ref` (HMAC, not directly correlatable
without the key), `conversations.created_at_utc`. If a beneficiary's
Telegram account has a public username, or uses the same wallet
pubkey as a known entity, the handle may correlate to a real
identity. The spec does not require handles to be opaque or random.

**Likely fix.** Either (a) recommend unguessable, random handles
generated by the bot at registration; (b) add a "known correlation
attack" note to the threat model so the operator can warn
beneficiaries to choose handles that don't correlate to other
identities.

### M10. `disbursement_recorded.replacement_fields` is not whitelisted

[`03-data-model.md:198-212`]

The `correction_recorded` event has `replacement_fields: { ... }` as
a free-form object. If corrections are kept (see C1), the set of
fields that can be replaced must be a fixed whitelist. Otherwise the
correction mechanism can change any field, including amounts.

**Likely fix.** Pin the allowed fields in the schema
(e.g., `receipt_ref` and `service_note` only). Anything else is
rejected with `422 VALIDATION_ERROR`.

### M11. The "Two-DB topology is one Cloudflare account" decision is re-stated 5+ times

[`01-architecture.md:233-237`], [`02-invariants.md:115-148`],
[`03-data-model.md:13-25`], [`05-hosting-and-deploy.md:24-30`],
[`06-security-model.md:51-67`], [`09-decisions.md:133-144`]

Five separate spec files repeat the same paragraph. This is
intentional and good for invariants (a privacy reviewer should be
able to find the rule from any spec section). But it creates
maintenance risk: a future change in any one place has to be
replicated in the others. Consider a "single source of truth" doc +
back-references in the other 4.

**Likely fix.** Make [`02-invariants.md:115-148`] the canonical
spec for the bot boundary invariant, and have the other 4 documents
reference it with a short summary.

### M12. `tools/anchor-job` and `tools/local-solana` exist as empty directories

[`tools/anchor-job/`, `tools/local-solana/`]

Both directories exist as placeholders. The spec references
`tools/anchor-job` (manual anchor CLI) but the directory is empty.
The spec also says local-validator tests are "deferred" but the
`tools/local-solana` directory exists empty. Either fill them or
remove the placeholders to avoid future confusion.

**Likely fix.** Either implement the placeholder roles (a
`tools/anchor-job` CLI that wraps the `vault-anchor-cron` logic for
operator use, a `tools/local-solana` script that starts/stops
`solana-test-validator`) or remove the directories and update the
spec.

---

## Low-severity issues

### L1. `vault-ingest` requires `HELIUS_RPC_URL` but the mock doesn't use it

[`apps/ingest/wrangler.jsonc:13-18`], [`apps/ingest/src/index.ts:1-26`]

The wrangler config lists `HELIUS_RPC_URL` as required; the mock
code doesn't read it. Harmless. Add a `// TODO: real ingest reads
this when fetching finalized txs` comment so a future agent doesn't
think it's unused.

### L2. `purchased_at_utc` "not in the future" doesn't account for clock skew

[`04-api.md:326`]

Allow up to 5 minutes of clock skew between the operator's browser
and the server. Otherwise legitimate disbursements get rejected when
the operator's laptop clock is fast.

### L3. `donation_confirmed` doesn't record which RPC source provided the tx

[`03-data-model.md:131-142`]

Useful for debugging Helius-vs-reconciliation issues. Optional.

### L4. `verification.ts` script command uses `npx tsx` but the project will use `pnpm`

[`04-api.md:212`]

`npx tsx ...` works but is inconsistent with the project's `pnpm`
toolchain. Use `pnpm dlx tsx` or document a `pnpm verify` script.

### L5. `telegram_chat_id_enc` envelope parsing format is informal

[`03-data-model.md:349-352`]

The envelope is `aesgcm:v1:<key_version>:<base64url nonce>:<base64url ct>`.
Format-string parsing is fine for an MVP, but a stricter parser (or
JOSE-style structured envelope) is better long-term. Document that
the parser must be strict: reject unknown version strings, reject
mismatched envelope-vs-row `key_version`, etc.

### L6. `service` enum ("Alter", "Yasno", "Zigmund", "Other") is hard-coded

[`04-api.md:318`], [`12-operator-frontend-ux.md:63`]

If a new therapy platform is added, the API and the operator UI both
need to be updated. This is a "small enough for MVP" choice, but the
list should be loaded from a single source (e.g., a config file or
the `wallets`-like reference table) so the operator UI and the API
can't drift.

### L7. The `landing.md` "open questions" section is older than the spec

[`docs/ui-prototypes/landing.md:148-157`]

The prototype's open questions ("project name", "CTA wording",
"RU/EN split") were partially answered in the spec ("Russian-first
copy", "Open fund" is implied). The prototype doc is a historical
artifact; the spec is current. This is fine, but the prototype
doc's "Status: exploratory" should be updated to "Status:
historical; see `11-public-frontend-ux.md` for current direction."

### L8. `docs/incidents/` does not exist

[`07-observability-and-ops.md:101-103`]

The spec says incidents go in `docs/incidents/<date>-<slug>.md`. The
directory doesn't exist. Add `docs/incidents/README.md` with a
template.

---

## Architectural re-estimation

Beyond the bug-class issues above, several **bigger questions** deserve
a second look. None of these are wrong, but they're places where the
spec made an early decision that has consequences the spec doesn't
fully work through.

### Q1. Is the 5-Worker split right-sized for MVP?

The 5 Workers (`api-read`, `api-write`, `ingest`, `anchor-cron`,
`tg-bot`) are split by **read vs write auth boundary**. This is a
sensible, principled split. The cost:

- 5 wrangler configs to maintain.
- 5 deploy steps.
- 5 secrets sets (some shared).
- Cross-Worker coordination problems (the read worker can't read
  anchor wallet balance — H4).

A 3-Worker alternative: `vault-api` (read + write), `vault-ingest`,
`vault-anchor-cron`, `tg-bot`. The read-write split can be enforced
**inside** a single Worker via Hono middleware: public routes have no
auth, write routes require `OPERATOR_TOKEN`. This is a smaller
operational surface and avoids the cross-Worker coordination problems
at the cost of one fewer trust boundary.

The spec is internally consistent on the 5-Worker split, and the
`OPERATOR_TOKEN` reach argument is real (one less secret to push
throughout the read surface). Recommend keeping 5 Workers but
**explicitly state the read-worker / anchor-balance path (H4)**
before committing to the split.

### Q2. Are the right patterns named?

The spec uses the **inbox pattern** correctly for the Helius webhook.
It does not name (or describe) the **outbox pattern** for the anchor
flow, even though "send tx → wait for finalization → append event"
is the textbook outbox scenario. The crash window (C2) is the
unaddressed outbox failure.

The **saga pattern** is not named for the disbursement-delivery
flow. The "operator records disbursement → bot delivers code → maybe
fails → maybe retries" is a long-running workflow. The current
spec describes it procedurally (call API, then call API, hope it
works). A saga would name: the steps, the compensating action
(re-`send-code` with a new code on a `failed` delivery), the
timeout, the idempotency key (the `public_beneficiary_ref` could
serve this).

**Likely fix.** Even if the patterns aren't fully implemented in
MVP, **naming them in the architecture spec** is the right move.
The next change that adds a "retry the bot handoff with a new code"
flow becomes a local edit to the saga, not a new conditional in the
operator UI.

### Q3. Is the bot boundary pattern-sensitive enough to warrant stronger

architectural separation?

The spec already separates the bot from the vault at the database,
binding, and Worker level. But:

- Both are in the same Cloudflare account.
- The bot is exposed to the public internet via `/tg/webhook`; a
  successful exploit against the bot Worker is also an exploit
  against the account.
- The bot has a state machine (handle registration → card request
  → delivery) that has its own correctness story, separate from
  the ledger.

A possible stronger topology: a separate Cloudflare account for the
bot, behind a separate domain, with the disbursement-delivery flow
going through an explicit cross-account API. The spec explicitly
rejected this for MVP ("operational overhead without enough benefit
at this scale" — [`09-decisions.md:133-144`]).

This is the right MVP call. But the spec should document the
**trigger for revisiting**: "if (a) the donor pool grows beyond
~10, or (b) a Cloudflare account compromise is documented to
expose bot state, or (c) the bot Worker handles >1000 messages per
day, move the bot to a separate account." This is consistent with
the explicit-deferral table style already in use.

### Q4. Does the spec under-design the **outbox** for anchor and

**saga** for delivery?

See Q2. Both are pattern-sensitive areas (per the
`architecting-changes` skill, money and long-running workflows
are the canonical "needs a pattern" domains). The spec describes
both procedurally and is silent on the failure-mode patterns.

**Likely fix.** Either implement the patterns now (and write BDD
scenarios for the failure modes), or document them as
"outbox/saga: implemented in MVP" / "outbox/saga: deferred to
Phase 2 with explicit risk acknowledgment in the runbook."

### Q5. The "operator token" is a single bearer token for two

different trust boundaries

`OPERATOR_TOKEN` is used by both `vault-api-write` (disbursement
recording) and `tg-bot` (send-code, pending-requests). These are
two different trust boundaries:

- The vault write trust boundary covers public-history changes.
  Leak impact: attacker can append false disbursement events.
- The bot delivery trust boundary covers beneficiary delivery.
  Leak impact: attacker can read pending bot requests and send
  arbitrary messages to beneficiaries.

A leak of the token in one Worker (e.g., a bot log accidentally
capturing it) compromises both. Rotating the token requires pushing
to two Workers.

**Likely fix.** Two tokens: `VAULT_OPERATOR_TOKEN` and
`BOT_OPERATOR_TOKEN`. The operator UI holds both. Rotation is
independent. This is a 30-line change; recommend doing it now
before the token pattern is established.

---

## Decisions to make (ADRs needed)

The following should be explicit human decisions, not buried in a
spec paragraph. Each is a place where the current spec picks one
option out of several reasonable ones, and where future maintainers
will want to know why.

1. **Correction policy (C1).** Are corrections allowed in MVP? If
   so, for which fields? This is a product and trust decision, not
   a tech one.
2. **Anchor crash recovery (C2).** What is the on-chain-vs-ledger
   reconciliation policy when a tx is finalized but the event isn't
   appended? Public notice? Retroactive backfill? Reject? This is
   also a trust decision.
3. **Solana SDK version (H1).** v1 (installed) vs v2 (spec'd). Pick
   one, update the lockfile or the spec.
4. **Donor source commitment (H2).** Should the
   `donation_confirmed` payload commit to a `donor_token_account_hash`
   so donors can prove their donation? This is a privacy-vs-trust
   trade-off.
5. **`balance_usdc_minor` naming (H3).** `balance_usdc_minor` vs
   `computed_balance_usdc_minor` plus a separate `/api/ata-balance`.
6. **5-Worker vs 3-Worker split (Q1).** Lock in the 5-Worker split
   (and resolve H4) or consolidate.
7. **Operator token count (Q5).** One token or two.
8. **Donor UX for recurring donations.** The MVP is
   "send-to-public-address". The UX must explain this is the only
   option and that the donor can save the address in their wallet.
   This is a small spec addition, not a feature change.
9. **Russian-first i18n (L7).** The prototype and the spec are
   Russian-first. This is documented in three places but not in
   `09-decisions.md` as a current decision. Add it.

The repo would benefit from a `docs/adr/` directory with one ADR
per decision. Recommended templates are in the
`documentation-and-adrs` skill.

---

## Recommended order of fixes

The issues above are not equally urgent. A reasonable pre-implementation
sequence:

**Phase A — Resolve critical issues (must, before code):**
1. C1: correction policy
2. C2: anchor crash recovery

**Phase B — Resolve high-severity inconsistencies (must, before code):**
3. H1: Solana SDK version
4. H6: `verify.ts` script path
5. H3 + H12: `balance_usdc_minor` naming
6. H4: anchor wallet balance query path
7. H7: cross-DB link
8. H11: binding allowlist enforcement
9. H5: canonical JSON standard

**Phase C — Resolve high-severity design holes (during code):**
10. H2: `donation_confirmed` payload
11. H8: `helius_inbox` PK design
12. H9: anchor race condition
13. H10: `service_note` validation
14. H13: `amount_usdc_minor` maximum
15. H14-H15: monorepo / Pages name

**Phase D — Resolve medium and low (polish):**
16. M1-M12 and L1-L8

**Phase E — Architectural decisions (ADRs):**
17. Q1, Q5: Worker split, operator token count
18. Q2, Q4: outbox / saga patterns
19. Q3: bot boundary revisit trigger

---

## What's NOT a problem (rebuttals)

Some things the subagent review flagged that, on closer reading, are
fine. Worth recording so they don't get re-flagged in a future review.

- **T6 Bot compromise blast radius** [`06-security-model.md:63-74`]:
  Honest, well-bounded. The "internal handles and bot identity refs
  are compromised" framing is correct.
- **Treasury key absence** [`06-security-model.md:28-36`]: Wrangler
  configs verified — no treasury key in any Worker Secret or env.
- **Webhook auth via `authHeader`** [`04-api.md:380-385`]: Simple,
  exact comparison. Mock implements correctly.
- **Public API redaction** [`04-api.md:533-537`]: Explicit denylist
  for handles, donor memos, full codes. Repeated 6+ times across
  specs. Consistent.
- **Donor memo not republished** [`04-api.md:135-137`],
  [`11-public-frontend-ux.md:73`]: Spec is consistent.
- **Operator token memory-only storage** [`12-operator-frontend-ux.md:35-49`]:
  Good policy. Testable.
- **Migrations are plain SQL** [`03-data-model.md:404-408`]: Good,
  simple. Migrations are version-controlled SQL, no ORM migration
  indirection.
- **Ledger is append-only** [`02-invariants.md:18-32`]: The
  enforcement plan (migration lint, static SQL checks, code review,
  narrow insert helper) is correct.
- **`bot-db` AAD design** [`03-data-model.md:345-356`]: Correct.
  Ciphertext copied between rows fails to decrypt. The AAD binds
  ciphertext to the row identity.
- **HMAC input `"tg-user:" + id`** [`02-invariants.md:125`]:
  Domain-separation prefix is fine. Could be more strict
  (UTF-8 explicit, max length pinned) — see C2 — but the basic
  design is correct.
- **Cloudflare Cron schedule `0 1 * * *`** [`apps/anchor-cron/wrangler.jsonc:20`]:
  Daily at 01:00 UTC. Reasonable.
- **The "operator-triggered backup" is the same code path as the cron**
  [`05-hosting-and-deploy.md:17-23`]: Correct decision. See M1 for
  the implementation note.

---

## Appendix: Evidence index

Quick pointers for the reader who wants to verify a specific claim:

- **Ledger append-only**: [`docs/specs/02-invariants.md:18-32`]
- **Event hash preimage**: [`docs/specs/03-data-model.md:60-85`]
- **`donation_confirmed` payload**: [`docs/specs/03-data-model.md:129-154`]
- **`disbursement_recorded` payload**: [`docs/specs/03-data-model.md:155-179`]
- **`anchor_published` payload**: [`docs/specs/03-data-model.md:180-196`]
- **`correction_recorded` payload**: [`docs/specs/03-data-model.md:197-212`]
- **`wallets` schema**: [`docs/specs/03-data-model.md:214-245`]
- **`anchor_runs` schema**: [`docs/specs/03-data-model.md:247-273`]
- **`helius_inbox` schema**: [`docs/specs/03-data-model.md:275-295`]
- **`handles` schema**: [`docs/specs/03-data-model.md:307-364`]
- **`conversations` schema**: [`docs/specs/03-data-model.md:366-388`]
- **Standard error response**: [`docs/specs/04-api.md:19-62`]
- **Endpoint table**: [`docs/specs/04-api.md:63-80`]
- **`/api/totals`**: [`docs/specs/04-api.md:87-114`]
- **`/api/donations`**: [`docs/specs/04-api.md:116-137`]
- **`/api/disbursements`**: [`docs/specs/04-api.md:139-164`]
- **`/api/ledger-events`**: [`docs/specs/04-api.md:166-189`]
- **`/api/verify`**: [`docs/specs/04-api.md:191-221`]
- **`/api/health`**: [`docs/specs/04-api.md:275-292`]
- **`POST /api/disbursements`**: [`docs/specs/04-api.md:299-347`]
- **`POST /api/anchor/manual`**: [`docs/specs/04-api.md:349-374`]
- **`POST /webhook/helius`**: [`docs/specs/04-api.md:376-431`]
- **`POST /tg/webhook`**: [`docs/specs/04-api.md:434-451`]
- **`GET /tg/internal/pending-requests`**: [`docs/specs/04-api.md:453-492`]
- **`POST /tg/internal/send-code`**: [`docs/specs/04-api.md:494-525`]
- **Cloudflare topology**: [`docs/specs/05-hosting-and-deploy.md:24-55`]
- **Secrets matrix**: [`docs/specs/05-hosting-and-deploy.md:57-103`]
- **CI/CD**: [`docs/specs/05-hosting-and-deploy.md:116-153`]
- **Threats T1-T7**: [`docs/specs/06-security-model.md:9-83`]
- **Privacy rules**: [`docs/specs/06-security-model.md:93-110`]
- **Logging policy**: [`docs/specs/06-security-model.md:112-138`]
- **Failure modes F-1 to F-15**: [`docs/specs/07-observability-and-ops.md:30-48`]
- **BDD scenarios**: [`docs/specs/08-testing-strategy.md:91-345`]
- **Current decisions**: [`docs/specs/09-decisions.md:9-164`]
- **Explicit deferrals**: [`docs/specs/09-decisions.md:166-182`]
- **Open questions**: [`docs/specs/09-decisions.md:185-209`]
- **Frontend stack table**: [`docs/specs/10-frontend-architecture.md:14-26`]
- **Operator auth policy**: [`docs/specs/12-operator-frontend-ux.md:35-53`]
- **Solana web3.js v2 in spec**: [`docs/specs/01-architecture.md:118`]
- **Pages project name `vault-web` in spec**: [`docs/specs/05-hosting-and-deploy.md:36`]
- **Pages project name `open-care-web` in inventory**: [`docs/ops/secrets-inventory.md:116`]
- **Sealed secrets status**: [`docs/ops/secrets-inventory.md:7-100`]
- **Solana web3.js v1 in lockfile**: `node_modules/@solana/web3.js/package.json` (1.98.4)
- **Mock webhook code**: [`apps/ingest/src/index.ts`], [`apps/tg-bot/src/index.ts`]
- **Wrangler configs**: [`apps/ingest/wrangler.jsonc`], [`apps/tg-bot/wrangler.jsonc`], [`apps/api-read/wrangler.jsonc`], [`apps/api-write/wrangler.jsonc`], [`apps/anchor-cron/wrangler.jsonc`]

---

*End of review. ~600 lines, 12 critical+high issues, 12 medium, 8 low,
9 architectural questions, 4 clean rebuttals, one recommended fix
sequence. Reviewed docs: 12 spec files + README + concept + initial
note + secrets inventory + DEVELOPMENT.md + AGENTS.md. Reviewed
code/configs: 2 mock Workers, 5 wrangler.jsonc files, 2 package.json,
2 tsconfig.json, root package.json + pnpm-workspace.yaml, lockfile,
.gitignore, .env.example.*
