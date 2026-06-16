# Implementer's Skeptic Review — `crypto-charity`

**Author role:** external TypeScript/Cloudflare engineer handed the docs and mock code, no prior context.
**Date:** 2026-06-16.
**Method:** read every file in scope; tracked every place a careful implementer would have to stop and ask the author. Skimmed `2026-06-16-comprehensive-review.md` (I do not have the other two prior reviews, and the task says not to look for them) — where a finding is the same as a labeled finding in that doc, I either sharpen it from a different angle or skip it.
**Total surface read:** ~4,400 lines of docs/code/config.

## TL;DR

The spec is **unusually thorough for a pre-implementation doc set**, and I would not be writing this review if the design did not take privacy, custody, and verification seriously. There is a real risk, however, of **spec drift into implementation**: many places say "the spec says X" but the actual `wrangler.jsonc`, the mock code, the lockfile, or the example payload contradicts the prose. The implementer will lose a half-day per drift to a wrong-but-defensible choice.

I have 28 questions below. They are written as: "I am about to write code. I have read everything. I cannot write this line without an answer from the author." A few are sharp restatements of items in `2026-06-16-comprehensive-review.md`; most are net-new from the implementer lens.

Top blockers, in order:
1. Canonical JSON standard is not pinned (RFC 8785 vs not — the entire verification story rests on it).
2. `secrets.required` is a non-standard wrangler field — either it is a real feature I missed or every config is wrong.
3. Solana SDK major version conflict (`@solana/web3.js` v1 installed, v2 specified) — blocks any code that touches RPC.
4. `donation_confirmed` payload lacks `instruction_index` / `transaction_version` — verification is fragile.
5. The `verify.ts` script referenced in the public API does not exist.
6. The `correction_recorded` semantic story is unfinished (which the prior review called C1, but the implementer angle is: what field-level check do I write?).
7. Operator token is one bearer for two trust boundaries.
8. Bot `send-code` has no documented mechanism to record the disbursement's `public_beneficiary_ref` on the conversation row — the spec describes the outcome but not the data flow.
9. `anchor_wallet_low_sol` has no defined reader — read worker has no RPC binding.
10. Brand string is `open-care.org` in three places and `opencare.org` / `open-care-web` in others, with no canonical source.

## Brand & product surface

### B1. What is the project's public brand string?

- The domain is `open-care.org` (inventory line 50; wrangler routes 19, 22; mock code references `staging.open-care.org`).
- The Pages project is `open-care-web` (inventory line 116; DEVELOPMENT line 68), but `05-hosting-and-deploy.md:36` says `vault-web`.
- `landing.html` exists; the SvelteKit implementation will likely have its own copy. There is no statement that copy is canonical.
- `package.json:2` has `name: "open-care"`. Internal references in the secrets inventory say `Crypto Charity / …`; the spec concepts say "Crypto Charity Vault" or "Open Care". The initial voice note says no name.

**If I have to invent:** the project name in user-visible copy is the human's choice; I'll go with "Open Care" or "Crypto Charity Vault" depending on the page. **Why this is risky:** the public landing, the disbursement receipt references, the `/about` page, the Telegram bot's `/start` greeting, and the operator's auth gate all need a consistent string. If a future donor emails about a "donation to Open Care" and the site says "Crypto Charity Vault", the user is confused and a possible support ticket.

### B2. Is the `vault-web` Pages project name intentional or stale?

- `05-hosting-and-deploy.md:36` says `vault-web`. `secrets-inventory.md:116` and `DEVELOPMENT.md:68` say `open-care-web`.

**If I have to invent:** I would assume the inventory is the operational truth and the spec is stale, but I would block on the human to confirm before doing `wrangler pages deploy`. **Why this is risky:** `wrangler pages deploy --project-name vault-web` will fail (project does not exist), or worse, create a new Pages project and split traffic between two projects. This is a real spend of time.

### B3. What is the `landing.html` prototype's relationship to the SvelteKit implementation?

- The prototype at `docs/ui-prototypes/landing.html` is referenced from `11-public-frontend-ux.md:43` as a "visual model" for the landing page.
- The SvelteKit landing in `apps/web/src/routes/+page.svelte` does not exist yet. The architecture spec lists it but does not say "mirror the prototype section-by-section".

**If I have to invent:** I would copy the section structure (hero, metrics, recent feed, how-it-works, privacy promise, honest proof, report path) and the Russian copy, then rebuild in Bits UI. **Why this is risky:** the prototype uses hard-coded Russian strings with placeholder content; the SvelteKit implementation will re-derive copy from a separate source. Two sources of copy will drift. The author needs to say which one is canonical.

### B4. What is the contact path for `/contact`?

- The about/FAQ endpoints in `04-api.md:223-271` define `contact_url: "/contact"`. The static page in `apps/web/src/routes/contact/+page.svelte` does not exist.
- `CONTACT_URL=https://t.me/your-contact-channel` in `.env.example:45` is a placeholder. The secrets inventory line 195 says `CONTACT_URL: TBD`.

**If I have to invent:** I would point `/contact` to a Telegram channel or email. **Why this is risky:** donors reporting hash mismatches land on `/contact`. The `404`/empty placeholder URL is a privacy and trust regression.

### B5. The `/api/about` and `/api/faq` content is server-owned static copy — who writes and signs off on it?

- The spec says server-owned static. The FAQ example (lines 252-269) is plausible but minimal. There is no owner. No "FAQ content v1" reference. The Russian-first direction is set in `11-public-frontend-ux.md:165-177` but the JSON shape in `04-api.md` is English-keyed.

**If I have to invent:** I would draft the Russian content myself and ask the operator to review before launch. **Why this is risky:** the FAQ *is* the trust contract with donors. The current example contains three items; the spec lists six+ "what X proves / does not prove" topics. Either the FAQ is thin (donor questions unanswered) or the spec is over-promising.

## Database schema

### D1. The `helius_inbox` PK on `signature` alone is broken when a signature arrives via two paths.

- `03-data-model.md:280-291`: PK is `signature TEXT`, source is `('webhook', 'reconciliation')`. The PK cannot capture both paths.
- The spec also says the handler "inserts or finds" the inbox row (`03-data-model.md:294`). Reconciliation also inserts.

**If I have to invent:** I would `INSERT OR IGNORE` and let the first source win; the second path's `source` value is decorative. **Why this is risky:** for forensics ("did Helius deliver this, or only reconciliation?"), the first-seen path is lost. The `H8` finding in the prior review is the same concern; I would sharpen it: the **PK design loses information that the spec otherwise says is important**.

### D2. The `helius_inbox.status` enum is missing a `duplicate` state.

- Status is `('received', 'processing', 'processed', 'ignored', 'failed')`. Webhook replay of a `processed` signature is described in `08-testing-strategy.md:154-163` ("Duplicate webhook replay is safe"). What status does the second webhook write? The mock does not write the inbox row at all.

**If I have to invent:** I would add a `duplicate` status, or transition the existing row to `processing` → `processed` idempotently without re-appending the ledger event. **Why this is risky:** an `ignored` status suggests a bad payload; `processed` suggests a successful donation event. A re-delivered webhook should not look like a new or bad payload. Status-name pollution will make dashboards misleading.

### D3. `anchor_runs.locked_until_utc` is a TEXT column with no documented semantics.

- `03-data-model.md:262`: `locked_until_utc TEXT`, nullable. The cron and manual paths both write to this table. The spec never says what value is written, when, or how the lock is taken.
- The prior review's H9 calls out the cron+manual race. I agree, and the implementer needs the *contract* (TTL? what happens to expired locks?) to write a serializer.

**If I have to invent:** I would set `locked_until_utc = now + 5min` on transition to `sending` and treat a stale lock as expired. **Why this is risky:** a stale lock that never expires blocks manual anchors forever after a single crash. A lock with no TTL allows double-spend on race.

### D4. `wallets` table has a `cluster` column with `CHECK (cluster IN ('mainnet-beta', 'devnet', 'localnet'))` but the `localnet` case has no defined USDC mint.

- `03-data-model.md:222`, mint list at lines 240-244. Localnet has "Local test mint" (TBD). The cluster value flows into event payloads (`cluster: "mainnet-beta"` in `donation_confirmed` example line 133). The values committed in payloads must match the wallet's cluster.

**If I have to invent:** I would skip the localnet row in MVP fixtures or hardcode a known-bad mint. **Why this is risky:** the cluster value is part of the hash preimage. If the read API or write API inserts a `localnet` row and then commits `cluster: "mainnet-beta"` in the event payload, verification breaks.

### D5. `conversations.public_beneficiary_ref` has a CHECK constraint; `service_note` does not.

- `03-data-model.md:159-168` (disbursement payload example) shows `service_note: null`; no DB CHECK. `conversations.public_beneficiary_ref` CHECK exists (line 373). The asymmetry is real.

**If I have to invent:** I would validate at the API/ORM level with Zod refinement; I would not add a DB CHECK because the spec did not call for one. **Why this is risky:** the spec says the `disbursement_recorded` payload stores `service_note`. The lack of a DB-level rule means a future migration adding `service_note` to a typed read model (the spec permits this) might be filled in by a different code path. Drift.

### D6. `disbursement_recorded.amount_usdc_minor` is stored as a string. What is the canonical form?

- The spec says "integer minor-unit strings". `04-api.md:316` validates with "positive integer minor-unit string" and `^[A-Za-z0-9-]{4,64}$` for `receipt_ref`. For `amount_usdc_minor`, no regex. `100000000` is valid; `+100000000`, `000100000000`, `100000000.0` — what passes? `disbursement_recorded` example has `"100000000"`.
- The spec also commits the value to the hash preimage, so the **bytes** matter. Leading zeros, signs, decimal points, trailing spaces all change the hash.

**If I have to invent:** I would require `^[0-9]+$`, value > 0, no leading zeros except `"0"` itself, max length 16. **Why this is risky:** two valid implementations can produce different canonical bytes and therefore different hashes. The prior review's H5/H13 noted this; I would sharpen: pick a regex, write it in the spec, and put it in a CI test that round-trips a known amount.

### D7. `donation_confirmed` payload has no `instruction_index` and no `transaction_version`.

- `03-data-model.md:131-142`. One Solana transaction can contain many SPL token transfers to the same ATA (real in wallet UX, MEV, refunds, etc.). The signature alone does not identify which transfer produced the event.
- The spec mandates `maxSupportedTransactionVersion: 0`, so the `transaction_version` is always `0` for now — but the payload does not commit to it. A future v1 transaction would parse identically and silently break.

**If I have to invent:** I would add `instruction_index: number` and `transaction_version: 0` to the payload, with a BDD scenario. **Why this is risky:** the prior review's H2 is right. From an implementer lens: if I write the parser without these fields, two writers picking the same signature with different transfers will produce non-reconcilable events. The chain is hash-correct but the semantic is ambiguous.

### D8. `ledger_events` does not store the WAL or replica state. D1 migrations must be ordered carefully.

- `03-data-model.md:33-50` is a single CREATE TABLE. `wallets`, `anchor_runs`, `helius_inbox` are separate. The migrations section (lines 404-408) says "plain SQL files" but does not name the migration tool. `drizzle-kit` is the chosen ORM (`01-architecture.md:117`) — does it own the migrations, or do plain SQL files get wrapped in a Drizzle config?

**If I have to invent:** I would use `drizzle-kit generate` to produce the SQL. **Why this is risky:** the spec name-drops both "plain SQL files" and "drizzle-kit". Either the migrations are Drizzle-managed (no plain SQL) or they are hand-written and Drizzle wraps them. If I use Drizzle generator output, the migration files look like Drizzle's auto-format, not "plain SQL". Future readers will be confused.

### D9. Migrations must not UPDATE/DELETE `ledger_events`. How is this enforced in code review?

- `02-invariants.md:28-32` says "Enforced by: migration lint, static SQL checks, code review rules, and a narrow ledger insert helper." `06-security-model.md:181` says "`wrangler.toml` binding allowlist is checked in CI."
- The actual enforcement mechanism is named four different ways in four different files. None of them exist as code yet (no `.github/workflows/`, no `tools/check-bindings/`).

**If I have to invent:** I would write a small Vitest test that greps the migration directory for `UPDATE ledger_events` and `DELETE FROM ledger_events`. **Why this is risky:** the "no UPDATE/DELETE on ledger_events" rule is the trust foundation. If enforcement lives only in code review, the next refactor that adds `ALTER TABLE ledger_events ... UPDATE` is silent until production.

### D10. `wallets.usdc_ata` and `wallets.usdc_mint` are nullable. For which roles?

- `03-data-model.md:224-225`: `usdc_mint TEXT, usdc_ata TEXT`, both nullable. The MVP rows are `treasury` (has both) and `anchor` (no — anchor is SOL-only). So the anchor row stores `NULL, NULL`. There is no row-level CHECK for "if role='treasury' then both are non-null".

**If I have to invent:** I would add a CHECK constraint or a runtime validator. **Why this is risky:** a misconfigured row (treasury with NULL `usdc_ata`) means the API endpoint that lists treasury for display will not render the address. Worse, an `anchor` row mistakenly created with a non-NULL `usdc_mint` may be misread by the read API.

## API contracts

### A1. `/api/ledger-events` returns `payload_json` as a **string** containing nested JSON. The contract is awkward.

- `04-api.md:172-186`. `payload_json: "{...canonical...}"` — a string of JSON. Verifiers must `JSON.parse(payload_json)` to get the `payload` object that participates in the hash.
- The `event_hash` preimage (per `02-invariants.md:46-54`) is computed over the **parsed** payload, not over the string. So the bytes committed by the hash are the parsed object's bytes, not `payload_json`'s bytes. This is correct but confusing.

**If I have to invent:** I would keep `payload_json` as TEXT in the DB (for storage efficiency and parity with the example) but return both `payload_json: string` and `payload: object` in the API. **Why this is risky:** donors running verifiers will `JSON.parse(payload_json)` and then re-serialize. If the re-serialization is not canonical (e.g., a donor uses `JSON.stringify(obj, null, 2)`), the bytes differ and the hash breaks. The spec should say "the API returns `payload_json` as the canonical bytes that were hashed; verifiers should not re-serialize."

### A2. `/api/verify` returns `previous_anchors: []` without a documented cap.

- `04-api.md:208-215`. Empty array in the example, no note on growth. The prior review's M4 caught this. From an implementer lens: I do not know if I should cap at 30, paginate, or include all.

**If I have to invent:** I would cap at 30 and add `next_anchor_cursor`. **Why this is risky:** a year of daily anchors is 365 entries. JSON parsing in browsers starts to slow at ~1MB. Latent bug.

### A3. `/api/about` and `/api/faq` are described as `static copy` but live in an API.

- `04-api.md:223-271` and `11-public-frontend-ux.md:142-148`. The SvelteKit routes `/about` and `/faq` can either call the API or render hardcoded copy. The architecture spec says "Static read-only pages" but the API defines a JSON response with a `updated_at_utc` field — i.e., content that can be updated.

**If I have to invent:** I would have the API return the canonical copy, the SvelteKit page render the JSON. **Why this is risky:** if the SvelteKit page renders hardcoded copy in Russian and the API has its own copy in English, they drift. Pick one source.

### A4. `/api/health.ingest_recent_or_empty` — what is "recent"?

- `04-api.md:280-289`. No threshold. The observability spec (`07-observability-and-ops.md:25`) says "donation ingest is recent, or no donations exist" without a window.

**If I have to invent:** I would use 24 hours (one day, one anchor cycle). **Why this is risky:** "recent" without a number is a render-side guess. The frontend's "stale" label needs a number.

### A5. `/api/health.helius_inbox_backlog_ok` — what is "backlog"?

- `04-api.md:287`. No threshold. No description of which statuses count as "backlog" (`received` only? `received` + `processing`?).

**If I have to invent:** I would count `status='received'` AND `received_at_utc < now - 1 hour`. **Why this is risky:** the operator needs to know if ingestion is stuck. Without a threshold the field is either always true (operator never sees degraded) or always false (alarm fatigue).

### A6. The `service_note` 3-state ambiguity is real and not resolvable from the spec.

- `04-api.md:319`: "required only for `Other`, max 64 characters". Example shows `service_note: null` even when service is `Alter`. So: null is valid for Alter. The spec does not say what happens with `service="Other"` and `service_note=""` (empty string), `service="Other"` and `service_note` omitted, or `service="Alter"` and `service_note` non-null.
- The prior review's H10 caught this. I sharpen: I cannot write a Zod schema for the request without three explicit decisions.

**If I have to invent:** I would write:
- `service="Alter"|"Yasno"|"Zigmund"` + `service_note=null` or omitted → valid.
- `service="Alter"|"Yasno"|"Zigmund"` + `service_note="<non-null>"` → 422.
- `service="Other"` + `service_note` omitted or null → 422.
- `service="Other"` + `service_note=""` (empty) → 422 (min 1 char).
- `service="Other"` + `service_note` 1..64 chars → valid.

**Why this is risky:** three different validations are possible interpretations of the spec. The donor's operator UI sends a payload; the API either accepts or rejects. Without a precise rule, the frontend and backend can disagree on the same payload.

### A7. The disbursement `recorded_by` field is hardcoded to `"operator"`. The chain commits to this string.

- `03-data-model.md:167`: `recorded_by: "operator"`. This is in the hash preimage. If a future feature accepts dynamic `recorded_by` (e.g., `"alice"` for multi-operator), the hash preimage changes for new events but not for old ones.

**If I have to invent:** I would leave it as the constant `"operator"` and document that multi-operator is a future change. **Why this is risky:** the prior review's Q5 calls for two operator tokens; the same logic says two operator identities. Either plan it now or add a note that the chain value is forever.

### A8. `POST /api/anchor/manual` request body is `{ "source": "operator-manual" }` — what does `source` do?

- `04-api.md:350-354`. The example sends `source: "operator-manual"`. The `anchor_runs` schema has no `source` column. The handler does not document what it does with the value. Is it logged? Used for filtering?

**If I have to invent:** I would ignore `source` server-side (the request comes from an authenticated operator) and log it for observability. **Why this is risky:** if `source` is meant to be a public label on the resulting `anchor_published` event (e.g., a payload field), the chain commits to it. If it's a log-only field, the spec should say so.

### A9. The response of `POST /api/anchor/manual` has `status: "published"` or `"already_published"`. What about failure states?

- `04-api.md:363-373`. `200` returns one of two statuses. What about RPC failure, SOL too low, locked anchor_runs, missing config? The spec does not say. The H1 finding in the prior review touched this.

**If I have to invent:** I would return `503` with `UNAVAILABLE` and the `anchor_runs.status='failed'` for hard failures, `409 CONFLICT` for locked runs. **Why this is risky:** the operator UI's "Published/Already-published/Failed" state matrix (`12-operator-frontend-ux.md:125-128`) implies a failure state in the response. The API spec is silent on the shape.

### A10. `POST /tg/internal/send-code` request takes `opaque_id` and `conversation_id` but the disbursement event has `public_beneficiary_ref`. How is the ref written to `conversations.public_beneficiary_ref`?

- `04-api.md:500-525`. The request body has `{opaque_id, code, conversation_id}`. No `public_beneficiary_ref` field. The schema (`03-data-model.md:373`) has a `public_beneficiary_ref` column on `conversations`. The cross-DB link is broken in the documented API. The prior review's H7 caught this. From the implementer lens: I cannot write the bot handler because the spec says the link exists but gives no mechanism.

**If I have to invent:** I would add an optional `public_beneficiary_ref` field to the `send-code` request. The operator UI passes it from the disbursement response. **Why this is risky:** the disbursement ledger event and the bot conversation are not linked, so an auditor cannot trace a public disbursement to its delivery.

### A11. `POST /tg/webhook` lists `/card` as a command that creates a "pending card request" but the spec does not say what data the request stores.

- `04-api.md:434-451`. `/card` creates a `conversations` row with `kind='card_request'`. What is in the payload? Is there a free-text beneficiary request? A selected service? The pending-requests response has `internal_handle`, `request_status`, `created_at_utc` — no body.

**If I have to invent:** I would add a `request_text TEXT` column on `conversations` for the beneficiary's free-form text (if any). The spec does not say whether `/card` takes a message argument. **Why this is risky:** the bot workflow described in `12-operator-frontend-ux.md:80-100` shows the operator selecting a request and entering a code. The spec does not say what the operator sees in the request — the only identifying info is the `internal_handle`. If the beneficiary says "I want a Yasno card, $50", the operator has no way to know from the API response.

### A12. The `public_beneficiary_ref` whitelist regex: `^benpub_[A-Z0-9]{16}$`. Is `[A-Z0-9]` exactly base32, Crockford base32, or any uppercase letter or digit?

- `04-api.md:323`, `03-data-model.md:172`. `[A-Z0-9]` matches `A-Z` and `0-9`. It excludes lowercase. It includes 0 and 1 which Crockford excludes as ambiguous (0/O, 1/I).
- The prior review's C1 calls this out only tangentially. From an implementer lens: the generation function must use only the allowed character set. `crypto.randomBytes(10).toString('base32')` produces lowercase; uppercase-only generators are not standard library.

**If I have to invent:** I would use `crypto.getRandomValues` and a custom alphabet `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` (32 chars, base32), then prefix `benpub_`. The 16 chars × log2(32) = 80 bits of entropy. **Why this is risky:** if generation uses `0-9A-Z` but the check is `^[A-Z0-9]{16}$`, fine. If generation uses base32 with lowercase and the API upcases, fine. If generation uses Crockford without `0/1`, the regex `^[A-Z0-9]{16}$` still matches because Crockford is a subset. The risk is not the contract; the risk is that the implementation produces a ref the test vector doesn't match, and the test fails for no spec reason.

## Hash chain & canonicalization

### H1. What is the canonicalization standard? RFC 8785 (JCS) or custom?

- `02-invariants.md:45-54`, `03-data-model.md:60-85`. The spec says: "Object keys are sorted lexicographically. Numbers that represent money are integer minor-unit strings; no floats. Strings are UTF-8. Nullable fields are represented as `null`, not omitted."
- This is a description, not a standard. JCS (RFC 8785) has explicit Unicode normalization (NFC), no whitespace, sorted keys, escapes `\b`, `\f`, `\n`, etc., in a specific way. Some libraries (e.g., `canonicalize` npm package) implement RFC 8785; others implement subset rules.

**If I have to invent:** I would use `canonicalize` (npm) which implements RFC 8785, document that the project pins RFC 8785, and add a normative test vector. **Why this is risky:** the prior review's H5 caught this. From the implementer lens: I cannot write a hash function without the spec pinning the standard. If the founder's first manual hash used one library and the donor's verifier uses another, the donor's hash will not match. The trust story collapses.

### H2. `created_at_utc` precision: second or millisecond?

- `03-data-model.md:45` says "ISO-8601 UTC" with no precision rule. Examples show `2026-06-14T10:23:00Z` (second precision) and `2026-06-14T10:23:01Z` (also second). Millisecond precision is also a valid ISO-8601.
- This is in the hash preimage.

**If I have to invent:** I would pin second precision with no fractional seconds. **Why this is risky:** two implementations, one writing `10:23:00Z` and one writing `10:23:00.000Z`, produce different canonical bytes and different hashes. Trust story breaks.

### H3. The `payload` field in the hash preimage is the *parsed* value of `payload_json`. So the hash commits to the parsed object's bytes, not the stored TEXT bytes. Is that right?

- `03-data-model.md:73-82`: "`payload` is the parsed JSON object stored in `payload_json`." So the hash is `SHA-256(canonical_json({sequence_no, event_type, parsed_payload, prev_hash, created_at_utc}))`.
- But `payload_json` is the stored text. If the stored text is `{"a":1,"b":2}` and the parsed value is `{a:1, b:2}`, then re-serializing the parsed value with sorted keys gives `{"a":1,"b":2}` — same. If the stored text has a typo (e.g., `{"a":1, "b":2 }` with trailing space), parsing succeeds but the canonical form is the parsed-and-re-serialized. The stored `payload_json` and the bytes that were hashed can differ.

**If I have to invent:** I would assert at insert time that `JSON.parse(payload_json)` re-serializes to `payload_json` (i.e., stored text is already canonical). If not, I would re-serialize to canonical before insert and store the canonical text. **Why this is risky:** if `payload_json` is "raw stored text" and the hash is "canonical re-serialized bytes", the bytes that were hashed are not visible in the database. A donor reading the DB and the donor verifying offline will get different hashes. This is a verifier-vs-DB divergence.

### H4. The hash preimage is JSON. What if the same canonical JSON produces different bytes on different platforms?

- JSON.stringify in Node uses the same character set. JSON.parse in Go is the same. But the question is: what bytes are in the SHA-256 input? If I use a library that adds a trailing newline, the hash changes. If I use a library that escapes `</script>` to `<\/script>`, the hash changes. The canonical spec must pin this.

**If I have to invent:** I would pin: no trailing whitespace, no extra escape sequences, UTF-8 with NFC normalization, no BOM. **Why this is risky:** the prior review's H5 was correct. From the implementer lens: I cannot write a test vector without these pinned. A donor verifier written in Python that uses `json.dumps(obj, sort_keys=True, separators=(',', ':'))` will produce RFC 8785-compatible output for the simple cases. But for special characters (forward slash, non-ASCII, surrogate pairs) the rules differ.

### H5. The `correction_recorded` event is part of the hash chain (it's a row in `ledger_events`). How does the public API expose the "current value" of a corrected field?

- The prior review's C1 caught this. From the implementer lens: when I write `/api/disbursements`, what value of `receipt_ref` do I return? The original (committed in the chain) or the latest replacement? The example correction (`03-data-model.md:201-211`) replaces `receipt_ref` with `A1B2C4`. If the API returns `A1B2C4`, the donor reading the JSON sees a different value than the donor running the hash chain.

**If I have to invent:** I would return the original event payload (matching the chain) and add a separate `?include=corrections` flag. **Why this is risky:** the trust story says donors can recompute the chain. If the API gives a different value than the chain, donors lose trust in the API. The first donation that is corrected and produces a mismatch becomes a support ticket.

## Anchor flow

### AC1. The anchor cron and manual paths both call "the same code" — but where is the function?

- `01-architecture.md:88-91`, `05-hosting-and-deploy.md:17-23`, `12-operator-frontend-ux.md:115-132`. The "same code path" is described but not located. There is no `apps/anchor-cron/src/anchor.ts` yet. The prior review's M1 caught this. From the implementer lens: do I export `runAnchor()` from `vault-anchor-cron`? Do both the cron and the `POST /api/anchor/manual` handler import it? Or is the function in `packages/vault-core`?

**If I have to invent:** I would put `runAnchor()` in `packages/vault-core` and import from both `apps/anchor-cron` and `apps/api-write`. **Why this is risky:** divergent code paths is a classic source of "the cron works but manual doesn't" bugs. The spec implies one function but does not say where it lives.

### AC2. The anchor memo `ccv-anchor:<64hex head_hash>` is the only on-chain payload. What is the head_hash format — lowercase or uppercase hex?

- `02-invariants.md:88-101`: `^ccv-anchor:[0-9a-f]{64}$`. Lowercase.
- The event_hash stored in `ledger_events.event_hash` is also `[0-9a-f]{64}` per `03-data-model.md:44`.
- The internal `head_hash` is the event_hash of the previous row.

**If I have to invent:** I would always emit lowercase hex for the memo. The `runAnchor` function would lowercase the head_hash before building the memo. **Why this is risky:** if the head_hash is uppercase and the memo regex is lowercase-only, the memo regex check fails and the anchor is rejected. Or worse, the memo is sent with the original case and the verifier's regex check is non-strict.

### AC3. The `anchor_runs.status='sending'` state — when is it set, and how does the cron recover from a crash mid-send?

- `02-invariants.md:73-87`, `03-data-model.md:248-273`. The state machine is `pending → sending → published | failed`. The `sending` state is implied but the transition timing is unclear. The prior review's C2 caught this. From the implementer lens: the recovery code is non-trivial.

**If I have to invent:** I would implement the recovery: on cron tick, scan `anchor_runs WHERE status='sending' AND updated_at_utc < now - 5min`. For each, look up the tx on-chain. If finalized, append the `anchor_published` event with `published_at_utc` from the on-chain block time. **Why this is risky:** a tx on-chain with no matching event breaks the trust story. The recovery code is the load-bearing piece.

### AC4. `POST /api/anchor/manual` requires `OPERATOR_TOKEN`. Does it also check `ANCHOR_WALLET_SECRET`?

- The mock for `vault-api-write` has only `OPERATOR_TOKEN` (`apps/api-write/wrangler.jsonc:13-15`). The anchor wallet secret is only on `vault-anchor-cron` (`apps/anchor-cron/wrangler.jsonc:13-18`).
- If the manual anchor is implemented as "the api-write worker calls the anchor-cron worker", the secret must be visible to api-write. Or the manual anchor is implemented as "the api-write worker invokes a shared function in `packages/vault-core`" — same problem.

**If I have to invent:** I would put the manual anchor handler in the same Worker as the cron (`vault-anchor-cron`) by adding a route. The cron Worker has both bindings. The api-write worker has no `ANCHOR_WALLET_SECRET`. The frontend calls `staging.open-care.org/anchor/manual` which is the cron Worker. **Why this is risky:** if the api-write worker needs the secret to call the function, the secret leaks to a worker with broader write access. The split between `api-write` and `anchor-cron` is a real privacy boundary.

### AC5. The anchor is published on a daily cron at `0 1 * * *`. What is the "anchor day"?

- `apps/anchor-cron/wrangler.jsonc:20` and `02-invariants.md:99-101`. The `anchor_date` is in the event payload (`03-data-model.md:184`). Is it the cron-trigger date (UTC) or the slot/block time of the on-chain tx?

**If I have to invent:** I would use the UTC date of the on-chain block time. **Why this is risky:** the cron may run at 01:00 UTC on June 15 but finalize at 01:00:30 on June 15. If the cron is delayed (RPC slow, queue lag), it may finalize on June 16 UTC. The `anchor_date` is the day, but which day? Spec is silent.

## Bot & privacy

### BP1. The bot's `telegram_chat_id_enc` envelope parser must be strict. The spec says "the envelope" format but not what to do with non-matching versions or malformed envelopes.

- `03-data-model.md:345-352`. The envelope is `aesgcm:v1:<key_version>:<base64url(nonce)>:<base64url(ct)>`. No note on what happens if `key_version` in the envelope does not match the row's `telegram_chat_key_version`. No note on what happens for a future `aesgcm:v2` envelope in a `v1` row.

**If I have to invent:** I would require envelope version string to match a whitelist (`v1` only for now), require `key_version` field to match the row's column, and reject any unknown fields. **Why this is risky:** a permissive parser accepts attacker-crafted envelopes during a key rotation. The prior review's L5 caught this.

### BP2. The HMAC input is `"tg-user:" + telegram_user_id`. The prefix is the domain separation. What if Telegram user IDs are not numeric?

- `02-invariants.md:122-148`. Telegram user IDs are integers. The HMAC input is `"tg-user:" + numeric_string`. The prefix prevents the same key from being used for other identifiers. Fine.
- But the spec does not say what happens for group chat IDs, channel IDs, or updates with no user (channel posts).

**If I have to invent:** I would use the same prefix for chat IDs too (different domain) and reject updates with no `from` field. **Why this is risky:** if a bot update is a channel post or anonymous admin, there is no `from.id`. The handler must reject it. The spec does not say.

### BP3. The `handle` column has a CHECK `lower(substr(handle, 1, 7)) <> 'benpub_'`. What about emoji, zero-width characters, RTL marks, control characters?

- `03-data-model.md:311-321`. The handle is `TEXT NOT NULL UNIQUE COLLATE NOCASE`. No character class restriction. The bot can store `МойПсихолог` or `the​a1` (with a zero-width space).
- The CHECK only forbids the `benpub_` prefix.

**If I have to invent:** I would add a CHECK or Zod refinement: handle matches `^[A-Za-z0-9_]{3,32}$` (Latin alphanumeric + underscore, 3-32 chars). This is restrictive but safe. **Why this is risky:** an attacker can register a handle visually identical to another beneficiary's handle using Cyrillic 'а' vs Latin 'a'. Or a beneficiary can register a handle with hidden characters that get copied into a public-facing field. The spec does not restrict.

### BP4. The bot stores no plaintext Telegram user ID or chat ID at rest. But what about `first_seen_utc` and `last_seen_utc`?

- `03-data-model.md:311-321`. These are timestamps. They are not personally identifying, but in aggregate with `telegram_user_ref` they help correlate.

**If I have to invent:** I would keep them. They are not high-risk. **Why this is risky:** the spec lists forbidden columns (`telegram_user_id`, `telegram_chat_id`, `chat_id`) but does not list "timestamps are allowed". The spec is silent, so the implementer either follows the explicit denylist (allow timestamps) or errs on the side of "minimize all bot storage" (drop timestamps). The bot needs them for "active" checks. Not blocking, but a real choice.

### BP5. The `handle` field in `/tg/internal/pending-requests` response is "sensitive pseudonymous data". The spec says it "may be shown only inside `/admin`". The admin UI must decide: full handle, or redacted?

- `04-api.md:478-490`. The response includes `internal_handle` and the spec says it is "sensitive pseudonymous data" and "may be shown only inside `/admin`". The spec does not say whether the UI shows the full handle, the first/last char, or a hash.

**If I have to invent:** I would show the full handle inside `/admin` because the operator needs to disambiguate (multiple beneficiaries with similar handles). **Why this is risky:** if the admin UI is screenshotted or shared by an operator for support, the full handle is leaked. A redacted form (`the***a1`) is safer but less useful.

### BP6. The `send-code` response is `{delivered_at_utc}`. What about a 6xx failure from Telegram — does the response surface the retry path?

- `04-api.md:521-525`. The spec says "After delivery, bot storage keeps only delivery status plus code hash/last4, or a short-TTL encrypted value if retry requires it." The 200 response shape does not document what happens on a Telegram-side failure (e.g., bot blocked, chat not found).

**If I have to invent:** I would return `200 {delivered_at_utc}` on Telegram success, `409 CONFLICT {error.code: "DELIVERY_FAILED", message: "..."}` on Telegram failure, and store `status='failed'` on the conversation row. The operator can retry from the admin UI. **Why this is risky:** the operator UI's "Delivery handoff" state matrix (`12-operator-frontend-ux.md:158`) implies a failed state. The API spec is silent.

## Worker bindings & secrets

### WS1. The `secrets.required` field in wrangler.jsonc is not a standard wrangler schema field.

- `apps/ingest/wrangler.jsonc:13-18`, `apps/tg-bot/wrangler.jsonc:13-21`, `apps/api-write/wrangler.jsonc:13-15`, `apps/anchor-cron/wrangler.jsonc:13-18`. All four configs use `"secrets": { "required": [...] }`.
- A grep of the wrangler schema docs and the prior review shows this is not a standard wrangler field. The standard field is no field — wrangler checks secrets at deploy time, and missing secrets are an error.

**If I have to invent:** I would treat it as a custom CI check, or remove it and rely on the deploy-time error. **Why this is risky:** if wrangler silently ignores the field, the agent may believe a "missing secret" is caught at deploy, but wrangler may not catch it the way the agent expects. The agent's intent is right ("fail closed if these secrets are missing"); the mechanism is unverified.

### WS2. The `vault-api-read` worker has no `secrets.required` but no secrets at all — yet `/api/health.anchor_wallet_low_sol` requires an RPC call to read the anchor wallet balance.

- `apps/api-read/wrangler.jsonc:1-16`. The read worker has only the `vault_db` binding. The health check requires the anchor wallet's SOL balance (`04-api.md:280-289`). The prior review's H4 caught this.
- The implementer lens: I cannot implement this check from the read worker without either (a) a new secret, (b) a new binding to read from a `wallet_health` table populated by the anchor-cron worker, or (c) a Worker-to-Worker call.

**If I have to invent:** I would have `vault-anchor-cron` write `last_anchor_wallet_sol_lamports INTEGER` to `anchor_runs` on every run, and the read worker reads the latest `anchor_runs` row. **Why this is risky:** without a defined path, the implementer will either add a secret to the read worker (forbidden — read worker must have no secrets per `01-architecture.md:38`), or hardcode `false` (silently wrong), or skip the field.

### WS3. The `OPERATOR_TOKEN` is used by both `vault-api-write` and `tg-bot`. The prior review's Q5 flagged this. From the implementer lens: do I use the same secret name and value, or rename to two secrets?

- `apps/api-write/wrangler.jsonc:14`, `apps/tg-bot/wrangler.jsonc:15`. Same name. The secrets inventory has only one row.
- The same token is the bearer for `POST /api/disbursements` (vault write) and `GET /tg/internal/pending-requests` (bot read) and `POST /tg/internal/send-code` (bot write).

**If I have to invent:** I would split into `VAULT_OPERATOR_TOKEN` and `BOT_OPERATOR_TOKEN`. The operator UI holds both. The frontend uses the appropriate one for the endpoint. **Why this is risky:** a leak in one Worker (e.g., a bot log accidentally capturing the token) compromises both. Rotation is global.

### WS4. The `TG_BOT_TOKEN` is on `tg-bot` but the bot needs to call Telegram's API. The Worker has internet egress, so this works. But what about the `sendMessage` API URL?

- `04-api.md:497-518`. The bot decrypts the chat route, then "Send the code through Telegram `sendMessage`." The full URL `https://api.telegram.org/bot<token>/sendMessage` is not specified. The JSON body shape (`{chat_id, text}`) is not specified.

**If I have to invent:** I would call `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage` with `{chat_id, text, parse_mode: "HTML"}` or `"MarkdownV2"`. **Why this is risky:** HTML/Markdown choice affects escaping. A `&` in the gift card code (`ALTER-GIFT-1234`) is fine in plain text, breaks in HTML. The spec does not say.

### WS5. The `ANCHOR_WALLET_SECRET` is in `vault-anchor-cron` and the `tools/anchor-job`. Both must decode the same secret format. The format is not specified.

- `docs/ops/secrets-inventory.md:137`: "Anchor wallet keypair. Holds only SOL for Memo fees."
- The prior review's M1 caught this. From the implementer lens: the secret is `wrangler secret put ANCHOR_WALLET_SECRET`. Is the value a base58 string (`[1,2,3,...,k]` from `solana-keygen new`)? A JSON array of bytes? A Solana CLI keystore JSON? A `Uint8Array`?

**If I have to invent:** I would use the base58 string format from `solana-keygen new --no-bip39 passphrase`. **Why this is risky:** if the operator generates a key with the Solana CLI and the Worker code expects a JSON keystore, the Worker fails to parse. The spec does not say.

### WS6. The `TG_ID_HMAC_KEY` and `TG_CHAT_ENC_KEY` are listed in the inventory as "32-byte" but not as base64/base64url/hex.

- `docs/ops/secrets-inventory.md:146`: "Keyed HMAC key for non-reversible stable Telegram user references." Not format-specified.
- Line 147: "AES-GCM encryption key for Telegram chat delivery routes. Versioned; rotation decrypts/re-encrypts rows." Not format-specified.
- `.env.example:27-28` has `dev-hmac-key-change-me-32-bytes-min` and `dev-aes256-gcm-key-change-me-32-bytes` — strings, not bytes.

**If I have to invent:** I would use base64url-encoded 32-byte random values. Web Crypto's `subtle.importKey` accepts `raw` format with a `Uint8Array`. The wrangler secret value would be the base64url string; the Worker would `atob()` to get the bytes. **Why this is risky:** if the operator uses a 32-char ASCII string (32 bytes ASCII), the key is not 256 bits of entropy — it's 256 bits of human-typed entropy. Worse, ASCII characters are not 0-255 uniformly. The spec must say "32 random bytes, base64url-encoded" or "32 random bytes, raw".

## Frontend

### F1. The frontend is Russian-first. The `apps/web/` is empty. The frontend must import a `packages/vault-core/` for canonicalization, but `vault-core/src/` is empty.

- `10-frontend-architecture.md:21-22` says "The frontend may import read-only Zod schemas from `packages/vault-core` for API contract decoding, but it must never import backend internals or database modules."
- `packages/vault-core/src/` is empty.
- The prior review's M2 caught this. From the implementer lens: I cannot write the `/verify` page without a canonicalization function. The function must live somewhere.

**If I have to invent:** I would put the canonicalization in `packages/vault-core/src/canonical.ts` and the verify script in `apps/web/scripts/verify.ts`. The script depends on `vault-core`. **Why this is risky:** the prior review's H6 says the script is referenced in the API but does not exist. I would write it, but the package layout is undecided.

### F2. The `/admin` operator token is "memory-only in the browser". The spec says "Default idle timeout: 30 minutes." — but how is the timer started, reset, and persisted across SvelteKit route changes?

- `12-operator-frontend-ux.md:45-48`. Memory-only. 30-min idle timeout.
- SvelteKit `+layout.svelte` and `+page.svelte` are separate components. A single in-memory `let token = $state("")` in `+layout.svelte` is shared across child pages, but if the layout re-renders or the worker is recycled (Cloudflare Pages is edge-rendered; SvelteKit is browser SPA for /admin), state is preserved. If the user navigates from `/admin` to `/`, the token should be cleared.

**If I have to invent:** I would use a Svelte 5 rune at the layout level, clear on `visibilitychange` (tab inactive > 30 min), clear on `pagehide`, clear on logout. **Why this is risky:** the spec is silent on the implementation pattern. SvelteKit has 5 different state mechanisms (`$state`, stores, context API, etc.). The choice affects whether the token survives a route change.

### F3. The `/donate/[donationRef]` route is "ship only if wallet integration reliably returns a transaction signature." The wallet integration is not in the spec.

- `11-public-frontend-ux.md:77-89`. The status page is optional. The condition is a moving target.
- The spec mentions Solana Pay URIs and browser wallet popups (`10-frontend-architecture.md:144-145`) without choosing one. The `@solana/pay` package exists; using it requires a different transaction-shape (with a `reference` field) than a raw SPL transfer.

**If I have to invent:** I would defer the `/donate/[donationRef]` route and put the status guidance on `/donate` instead. **Why this is risky:** if the implementer picks one path (raw SPL transfer) and later the operator picks a different path (Solana Pay), the route works in dev but not in the operator's flow.

### F4. CORS for the operator write endpoints. The spec says "must allow only the configured frontend origin and must never use wildcard origins for authenticated requests." The implementation is per-Worker.

- `10-frontend-architecture.md:155-156`. The CORS config is per-Worker. `vault-api-write` and `tg-bot` must each configure CORS. The spec does not say what headers (`Authorization`, `Content-Type`, custom?) or methods (`POST` only? `OPTIONS`?).

**If I have to invent:** I would use Hono's `cors` middleware: `origin: [env.SITE_URL]`, `allowMethods: ['POST', 'GET']`, `allowHeaders: ['Authorization', 'Content-Type']`, `credentials: false`. **Why this is risky:** the `tg-bot` has both public routes (none currently, but `/start` is for users) and internal routes (`/tg/internal/*`). The same Worker serves both. CORS for `/tg/internal/*` should be stricter than for any future public route.

### F5. The `/ledger` page filters by event type. The spec says "filters by event type and cursor-based pagination" (`11-public-frontend-ux.md:103`). The API does not have a `type` filter parameter.

- `04-api.md:115-189` defines `GET /api/donations`, `GET /api/disbursements`, `GET /api/ledger-events`. `ledger-events` does not have a `type` filter. Donations and disbursements endpoints return only their type.

**If I have to invent:** I would add `?type=donation_confirmed` to `/api/ledger-events` or call all three endpoints and merge in the UI. **Why this is risky:** the spec says the ledger page filters by type. The API does not support it. The implementer either invents a new API or merges in the UI (more requests).

### F6. The `/verify` page has instructions `npx tsx apps/web/scripts/verify.ts --api https://<host>`. The script does not exist. The project uses `pnpm`, not `npm`/`npx`.

- `04-api.md:211`. The prior review's H6 and L4 caught this. From the implementer lens: I need to write the script. It should use `pnpm dlx tsx` or be a `pnpm` script.

**If I have to invent:** I would write `apps/web/scripts/verify.ts`, expose it as `pnpm --filter open-care-web verify` or `pnpm dlx tsx apps/web/scripts/verify.ts --api https://<host>`. **Why this is risky:** the spec tells donors a command that doesn't run. Donors will report this. It is the trust story.

### F7. The operator UI's manual anchor panel shows "Published/Already published/Failed". The failure case in the API is undocumented (`A9` above). The UI matrix says "do not imply a ledger event was appended" on failure.

- `12-operator-frontend-ux.md:125-128`. The UI must not show a fake `anchor_published` event on failure. This implies the API does have a failure shape.

**If I have to invent:** I would have the API return `200 {status: "failed", error_code, error_message, anchor_runs_id}` on a failed anchor. The UI renders the error. **Why this is risky:** see A9.

### F8. The FAQ copy direction is Russian-first. The `landing.html` prototype is also Russian-first. The `/api/about` and `/api/faq` JSON shapes are English-keyed. Three sources of copy, two languages.

- `04-api.md:223-271` defines `sections[].heading` and `sections[].body` (English keys, English examples). `11-public-frontend-ux.md:165-177` says Russian-first. `landing.html` is in Russian.

**If I have to invent:** I would put Russian content in the `heading` and `body` fields, document that the values are Russian, and the UI does not translate. **Why this is risky:** if the values are in English in the API and the UI translates to Russian, the English source must be authoritative. If the values are in Russian, the API contract is language-bound. The spec is silent on which.

## Testing

### T1. PR CI "must not require paid funds, real mainnet secrets, or funded mainnet wallets" — but `pnpm exec vitest run` is the only command that runs real code locally. What fixtures do I need?

- `08-testing-strategy.md:14-15`, line 119, line 132. PR CI is local. The spec does not say what fixtures are required for an empty ledger.

**If I have to invent:** I would seed an empty D1 (zero events), seed a small mixed ledger for the hash-chain tests, and skip the local-validator blockchain tests if `solana-test-validator` is not on PATH. **Why this is risky:** the spec says "BDD first" and lists 13 scenarios. The implementer needs the fixtures. The fixtures are not in the spec.

### T2. The local-validator test "must cover: UTF-8 Memo text, SPL token transfer parsing, configured vault ATA filtering, owner-watch candidate rejection, duplicate-safe ledger append, and hash-chain verification." Where do I put the test setup (keypair generation, mint creation, ATA funding)?

- `08-testing-strategy.md:53-56`. The setup is described but not located. `tools/local-solana/` is empty.

**If I have to invent:** I would put the setup in `tools/local-solana/` and the tests in `packages/vault-core/test/`. **Why this is risky:** the prior review's M12 caught the empty placeholder. From the implementer lens: the test setup script does not exist. I would have to write it.

### T3. The BDD scenario "donor runs their own verifier in any language and gets the same head hash" — the test is a normative test vector. None exists.

- The prior review's M3 caught this. From the implementer lens: I cannot write a multi-language verifier test without a normative test vector (a fixed event, the expected canonical bytes, the expected hash). The spec does not provide one.

**If I have to invent:** I would write a test vector in `docs/specs/03-data-model.md` (annex): one event, all fields, expected canonical bytes (hex), expected hash. **Why this is risky:** without this, the trust story's strongest claim ("donors can verify offline") is unprovable.

### T4. The `previous_anchors` array in `/api/verify` — how is the test fixture for "100 anchors" generated? Are the events seeded or computed?

- `04-api.md:208-215`. The spec says "After at least one successful anchor" and the example has `previous_anchors: []`. The growth path is implicit.

**If I have to invent:** I would seed `ledger_events` with N anchor events and verify the API response. **Why this is risky:** see A2.

### T5. The "Telegram bot identity storage" BDD scenarios require a fake Telegram bot token. Where is the test bot created?

- `08-testing-strategy.md:215-258`. The scenarios test the bot without real Telegram API. The test bot is a fake server that the Worker calls. The spec does not say where the fake is.

**If I have to invent:** I would use `nock` or a local express server. **Why this is risky:** the bot tests need a `TG_BOT_TOKEN` to format URLs, but the token does not need to be real. The test must not call Telegram's real API.

## Deployment & ops

### DOP1. The cron schedule is `0 1 * * *` (01:00 UTC daily). The "anchor day" is not aligned with the day boundary. See AC5.

- The cron runs at 01:00 UTC. If a donation comes in at 00:59 UTC on June 15 and the cron runs at 01:00 UTC, the anchor for "June 15" includes the donation. If the cron is delayed 5 minutes, the anchor date may be June 15 or June 16 depending on which `anchor_date` is used.

**If I have to invent:** I would use the on-chain block time's UTC date, not the cron-trigger time. **Why this is risky:** the operator runs a manual anchor at 23:59 UTC on June 15. The block time is 23:59:45 on June 15. The next cron at 01:00 UTC on June 16 sees an existing anchor for June 15 and skips. But the donor viewing `/api/verify` sees only one anchor for "June 15" and may wonder why the June 16 anchor is missing.

### DOP2. `/api/health` `anchor_stale` is `true` if "latest successful anchor is within 36 hours." The 36-hour threshold is in the observability doc but not the API doc.

- `04-api.md:280-289`, `07-observability-and-ops.md:24`. The 36-hour threshold is documented in observability but referenced by the API.

**If I have to invent:** I would put the threshold in a single config file or env var. **Why this is risky:** see prior review's M7. From the implementer lens: I have to hardcode 36 hours somewhere; if the docs are inconsistent, the code is consistent only with the file I read last.

### DOP3. The deploy workflow says "Apply D1 migrations" but does not say what happens if a migration fails partway. Is the deploy rolled back?

- `05-hosting-and-deploy.md:135-142`. The deploy steps include D1 migration. D1 migrations are SQL files run sequentially. If a file fails, partial state may exist.

**If I have to invent:** I would use Drizzle's migration runner with transactional semantics; SQLite (D1) supports `BEGIN ... COMMIT`. If a migration fails, the transaction rolls back. **Why this is risky:** see F-15 in the observability spec ("D1 migration fails partially. Treat as incident; do not mutate ledger_events to hide the issue."). The deploy should fail closed.

### DOP4. The `apps/web/` does not exist. The Pages project `open-care-web` is set up (per the inventory) but has no source. `wrangler pages deploy .svelte-kit/cloudflare --project-name open-care-web` will fail.

- `DEVELOPMENT.md:67-69`. The deploy command exists. The source does not.

**If I have to invent:** I would scaffold `apps/web/`, build, and deploy. **Why this is risky:** the deploy is in the deploy workflow. If the build fails or the source is incomplete, the deploy errors are not actionable.

### DOP5. The bot's "low-SOL alert" — the spec says `/api/health.anchor_wallet_low_sol` is `true` when the anchor wallet is below the configured fee reserve threshold. What is the threshold?

- `04-api.md:113`, `07-observability-and-ops.md:24`, `06-security-model.md:171-176`. The threshold is "configured" but not specified.

**If I have to invent:** I would use 0.05 SOL (enough for ~10 Memo transactions at typical fees). **Why this is risky:** 0.05 SOL is enough for devnet (fees ~5000 lamports) but barely enough for mainnet (priority fees vary). A 0.05 SOL threshold means the alert fires often on mainnet. A 0.5 SOL threshold means 100+ Memos before alert. The spec must pin this or expose a config.

### DOP6. The `previous_anchors` array in `/api/verify` — see A2.

### DOP7. The `landing.md` is "Status: exploratory" per the prior review's L7. The SvelteKit implementation must use it as a visual model, not a contract. The relationship is not pinned.

- `docs/ui-prototypes/landing.md`. The prototype is exploratory. The architecture spec is the source of truth. But the prototype has 548 lines of Russian copy and Svelte-specific layout. The implementer must either copy the copy (drift risk) or rewrite (cost).

**If I have to invent:** I would copy the section structure and Russian copy, build the layout in SvelteKit/Bits UI. **Why this is risky:** the prototype is a visual reference. The spec is a contract. The two are different.

## Cross-cutting

### X1. `Open Care` vs `Crypto Charity Vault` vs `open-care.org` — see B1.

### X2. The `published_at_utc` in `anchor_published` payload is "block time UTC" per the spec, but the event is appended by the Worker after the tx is finalized. The `created_at_utc` in the ledger row is the Worker's `now`, and the `published_at_utc` in the payload is the on-chain block time. These can differ by seconds.

- `02-invariants.md:60-66`: anchor payload includes `published_at_utc`. `03-data-model.md:80-85`: `created_at_utc` is the row creation time. They are different fields with different values.

**If I have to invent:** I would commit `created_at_utc = Worker.now()` and `published_at_utc = on-chain block_time_utc`. **Why this is risky:** the spec is clear that they are different, but the on-chain block time may not be in the canonical `created_at_utc` ISO format. The on-chain Solana block time is unix seconds; the spec wants ISO-8601 UTC. The conversion is `new Date(block_time * 1000).toISOString()` — and the resulting precision is seconds. If the Worker's `created_at_utc` is subsecond (e.g., from `Date.now()`), the two strings differ at the subsecond level, even if the displayed value is the same.

### X3. The `correction_recorded` `recorded_by` is also `"operator"`. Same hardcoded value as `disbursement_recorded`. See A7.

### X4. The `vault-ingest` mock does not use `HELIUS_RPC_URL`. The wrangler config lists it. If a future implementer keeps the wrangler config and the mock does not use the secret, the deploy still requires the secret to be set. The agent will not know whether to set it for the mock or only for the real implementation.

- `apps/ingest/wrangler.jsonc:13-18`. `apps/ingest/src/index.ts:1-27` does not read it. The prior review's L1 caught this.

**If I have to invent:** I would keep the wrangler config and add a comment. **Why this is risky:** the agent may think the secret is optional because the mock doesn't use it, and skip `wrangler secret put HELIUS_RPC_URL`, breaking the deploy.

### X5. The `landing.md` is exploratory; the architecture spec is the source of truth. But the spec references the prototype at `11-public-frontend-ux.md:43` ("The landing is based on `../ui-prototypes/landing.md`: a warm GitHub-like multi-rail public history feed."). The reference is a one-liner with no statement of "this is the visual model" or "this is the source of copy".

**If I have to invent:** I would treat the prototype as a visual reference and write the copy fresh in `apps/web/`. **Why this is risky:** the prototype has 548 lines of HTML and Russian copy. Re-deriving copy from a different source means the implementation will diverge in tone.

### X6. The `tg-bot` mock uses `c.req.header("X-Telegram-Bot-Api-Secret-Token")`. The spec says "exact comparison". The mock uses `!==`. The prior review's prompt mentions "constant-time comparison required?" The mock is not constant-time. The real implementation should be.

- `apps/tg-bot/src/index.ts:13`. The mock does `if (!received || received !== expected)`. Not constant-time.

**If I have to invent:** I would use Web Crypto's `timingSafeEqual` (or implement it with `subtle.verify` on a pre-known string). **Why this is risky:** at MVP scale the timing leak is theoretical, but the trust story is "we did it right". A `!==` is a small but visible imperfection.

### X7. The mock for `vault-ingest` returns `{accepted: 1, duplicates: 0}`. The spec example returns the same (`04-api.md:425-427`). But the spec is for a **batch** of webhook entries. The mock returns the body unchanged and a constant response. The real implementation must count accepted vs duplicates from the request body.

- `04-api.md:391-409` shows an array of webhook entries. The response counts `accepted` and `duplicates`.

**If I have to invent:** I would count distinct signatures: `accepted = number of new signatures`, `duplicates = number of signatures already in the inbox`. **Why this is risky:** if the response is wrong, Helius's retry logic may double-deliver or stop delivering.

### X8. The `tg-bot` mock returns `{ok: true}` or `{ok: false, error: "..."}`. This is not the standard error shape defined in `04-api.md:23-37`. The mock does not follow the spec's error contract.

- `apps/tg-bot/src/index.ts:14, 17`. The real implementation should return `{error: {code: "UNAUTHORIZED", message: "..."}}` per the spec.

**If I have to invent:** I would follow the spec. **Why this is risky:** the mock is a placeholder, but if the real implementation copies the mock's error shape, the contract is broken.

### X9. The `vault_db` binding is referenced in mock TypeScript types as `c.env.HELIUS_WEBHOOK_AUTH_HEADER` (ingest) and `c.env.TG_WEBHOOK_SECRET` (bot). The wrangler config also requires `HELIUS_RPC_URL`. The bindings are `vault_db` and `bot_db` (D1). The secrets and bindings are both on `c.env` in Hono. The naming is mixed (snake_case for D1, SCREAMING_SNAKE for secrets).

- `apps/ingest/src/index.ts:4`, `apps/ingest/wrangler.jsonc:6-12`. `vault_db` (snake_case) is the D1 binding. `HELIUS_WEBHOOK_AUTH_HEADER` (SCREAMING_SNAKE) is a secret. The two coexist in `c.env`.

**If I have to invent:** I would document the convention: `c.env.<binding_name>` for bindings, `c.env.SCREAMING_SNAKE` for secrets. **Why this is risky:** a future agent that writes `c.env.helius_webhook_auth_header` (lowercase) will get a TypeScript error and may not understand why.

### X10. The `record` for `vault-db` and `bot-db` exists in the inventory (`docs/ops/secrets-inventory.md:121-126`), but the `regions` (`EEUR`) are undocumented. Cloudflare D1 regions: pick the closest to the operator or the donors.

- The inventory says `EEUR`. The spec does not justify. The treasury wallet may be EU-based; the donors may be RU-based; the operator may be in another timezone.

**If I have to invent:** I would keep EEUR. **Why this is risky:** if the operator is in the US, every D1 read is 100-200ms. If the donors are concentrated in one region and the operator in another, a single region is wrong for one of them.

## Things the spec gets right (rebuttals from the implementer lens)

- **Treasury key absence:** the wrangler configs verified — no treasury key in any Worker Secret or env. Good.
- **The `telegram_chat_id_enc` AAD design:** the AAD binds to `opaque_id` and `telegram_chat_key_version`. Copying a ciphertext to another row fails to decrypt. This is correct and the implementer can write the encryption helper straightforwardly.
- **The bot's "sendMessage" path is in-memory only:** the spec explicitly says the chat_id is decrypted in memory and not logged. The implementer knows what to do.
- **`OPERATOR_TOKEN` is never logged:** the spec says this in three places. The mock does not log it. The real implementation can use Hono's `logger` middleware with a redaction list.
- **The `correction_recorded` event is a new ledger row, not an UPDATE:** this is correct (per I-1). The implementer knows the row is append-only.
- **The `previous_anchor_must_be_known` invariant for recovery:** see prior review's C2 rebuttal. The recovery path is the only thing left, and it is doable (see AC3 above for my proposed recovery code).
- **`pnpm-workspace.yaml` correctly enumerates `apps/*`, `packages/*`, `tools/*`:** the monorepo layout is correct. The `allowBuilds` / `onlyBuiltDependencies` lists are correct.
- **The `.gitignore` correctly excludes `.dev.vars*`, `.env*`, `.wrangler/`, `node_modules/`.** Good.

## Summary of blockers (questions I cannot write code for)

1. **H1**: Canonicalization standard. I need RFC 8785 or equivalent pinned.
2. **H2**: `created_at_utc` precision.
3. **H3**: Whether the stored `payload_json` is the canonical bytes or the parsed-and-re-serialized bytes.
4. **H5**: How the public API exposes "current value" of a corrected field.
5. **WS1**: The `secrets.required` field is non-standard.
6. **D1**: The `helius_inbox` PK loses source provenance.
7. **D3**: `anchor_runs.locked_until_utc` semantics.
8. **D6**: The canonical form of `amount_usdc_minor` strings.
9. **D7**: `donation_confirmed` lacks `instruction_index` and `transaction_version`.
10. **A5**: `/api/health.ingest_recent_or_empty` has no threshold.
11. **A6**: `service_note` 3-state ambiguity.
12. **A9**: `/api/anchor/manual` failure response shape.
13. **A10**: `send-code` request lacks `public_beneficiary_ref`; cross-DB link broken.
14. **A12**: The `^benpub_[A-Z0-9]{16}$` alphabet (base32? Crockford? any uppercase+digit?).
15. **AC3**: Anchor recovery from a crash.
16. **AC4**: Where does the manual anchor handler live? Same Worker as cron, or different?
17. **WS2**: `anchor_wallet_low_sol` has no defined reader.
18. **WS3**: One `OPERATOR_TOKEN` for two trust boundaries.
19. **WS5**: `ANCHOR_WALLET_SECRET` format (base58, JSON keystore, bytes).
20. **WS6**: `TG_ID_HMAC_KEY` and `TG_CHAT_ENC_KEY` format (raw bytes, base64, hex).
21. **F1**: `packages/vault-core` is empty.
22. **F2**: Operator token state pattern (Svelte 5 rune, store, context).
23. **F6**: `verify.ts` script does not exist.
24. **B1**: Brand string.
25. **B2**: Pages project name (`vault-web` vs `open-care-web`).
26. **T3**: Normative test vector for the canonical hash.
27. **X1**: Brand name (cross-cutting).
28. **X2**: `created_at_utc` vs `published_at_utc` precision.

That is, I have 28 blocking questions. Of these, **6 are not in the prior review** (or are sharper restatements of items in the prior review). The prior review covered the Solana SDK version, the lack of `instruction_index`, the balance naming, the binding allowlist, the verify script, the bot cross-DB link, the `helius_inbox` PK, the anchor race, the `service_note` ambiguity, and the operator token. I do not repeat those, except where the implementer angle adds a sharper question.

The docs are clear in many places; the spec is dense and well-organized. The risk is not in the prose but in the **places where the prose is silent, the examples are minimal, and the implementation must invent a contract**. The author needs to either pin the contracts or accept that the implementation will invent them and they will drift.
