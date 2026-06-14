# Crypto Charity Vault — MVP Concept

**Status:** Approved (ideation phase complete)
**Date:** 2026-06-14
**Scope:** MVP (Phase 1). Phase 2 decisions are deliberately deferred.

---

## Problem Statement

> **How might we** help people who cannot afford mental-health support get
> access to it — funded transparently by crypto donations and delivered with
> strong privacy — in a way that is small enough to start now, but can grow
> without rebuilding from scratch?

The user we *primarily serve* is the beneficiary (someone who needs therapy
sessions). The user we *primarily design for* is the donor (someone who
wants their crypto to actually reach a real person). MVP optimizes for
**donor trust and long-term sustainability**, with the beneficiary channel
designed around **anonymity from the operator** from day one.

---

## Recommended Direction

**"The Vault" — a transparent crypto charity with a private beneficiary
channel.** Donor-facing surface is a public, on-chain-auditable ledger of
donations and gift-card purchases with receipts. Beneficiary-facing surface
is a private Telegram bot, with **no beneficiary identity in our
database** (no Telegram IDs, no real names, no contact info). Operator (me)
runs the manual conversion loop: crypto in → wallet → buy Alter gift cards
by hand → publish receipts → distribute codes to beneficiaries via the bot.

The donor trusts the system because every ruble is traceable, every gift
card purchase is published with a receipt, and there is no plausible way
for the operator to extract value. The beneficiary trusts the system
because their real identity is never known to the operator, and the bot
handles the entire private channel.

Post-MVP Phase 2 (out of scope) extends the operator workflow into a "gift card
factory" with automation, optional verification, and a narrative layer
for repeat donor engagement.

---

## MVP Scope (what we are building)

### In scope

1. **Wallet integration.**
   - Single Solana wallet, stablecoin (USDT or USDC, to confirm at spec).
   - Public read-only view of incoming transactions.
   - Architecture supports multiple wallets later (a `wallets` table, not
     a hard-coded address), so we can add hot/cold/multi-sig without
     rewriting.

2. **Tamper-evident ledger: hash-chained DB + daily Solana anchor.**
   - **Off-chain DB is the source of truth.** Append-only — no `UPDATE`,
     no `DELETE` ever. Every record carries a `prev_hash` linking it to
     the previous record (git-style). Editing any historical record
     breaks the chain.
   - **Once a day, a CI job publishes the latest ledger hash to
     Solana** as a single small transaction (the hash goes in a memo
     field on a self-transfer or a no-op instruction). The same wallet
     that holds donations is the publishing wallet.
   - **Public site exposes verification:** anyone can pull the on-chain
     history of anchor transactions, recompute the hash chain from the
     public DB, and confirm the latest published hash matches. This
     gives donors a real, technical way to verify the ledger
     end-to-end — not just "we said we don't edit it."
   - **Anonymity preserved:** only the hash goes on-chain. No
     beneficiary handles, no amounts, no timestamps — just opaque
     digests. Nothing on-chain can be linked to a person.
   - **Why Solana:** best fit for "one cheap, fast, public
     verification transaction a day." USDC is a first-class SPL token
     (no bridge), consumer wallets (Phantom, Solflare) and a familiar
     explorer (Solscan) make donor verification easy, and
     transaction cost is a fraction of a cent — so the "we anchor
     daily" narrative is sustainable even at low donation volume.
     Ethereum L1 fees ($1–$10+, volatile) would be bad optics for a
     charity; L2s and Bitcoin are workable but have weaker stablecoin
     / consumer-wallet stories.
   - **Why not "fully on-chain":** gift-card receipts are off-chain
     data (screenshots, platform-generated), so a fully on-chain
     system still needs a DB — giving us *two* sources of truth,
     worse on anonymity (every record public forever), and a long
     learning curve in smart-contract development we don't need for
     MVP.
   - **Architecture is open to later upgrades:** multi-sig wallet
     (Squads), on-chain donation program, cross-chain donations — all
     possible without ripping out the hash-anchor pattern.

2. **Public donor-facing site (landing + ledger).**
   - Total in / total out / current balance.
   - Two-column history: incoming donations vs. outgoing gift-card
     purchases.
   - Each outgoing record has: amount, date, receipt reference (e.g.,
     receipt ID or anonymized screenshot URL), and **no beneficiary
     identity**.
   - Static, no auth. Read-only.
   - **Verify surface:** a page (or button) that shows the latest
     anchored hash, the on-chain transaction that published it, and
     instructions for re-running the hash chain independently. This
     is the donor's "proof we didn't tamper" affordance.

3. **Manual operator workflow (structured, not freeform).**
   - Operator (me) records each conversion: amount, gift card count,
     service (Alter), receipt reference, beneficiary handle (the
     pseudonym, see below).
   - This is the only place the system knows the operator is the
     operator. Everything else is anonymous-by-construction.

4. **Telegram bot (beneficiary channel).**
   - Operates on a separate bot account that the operator does not have
     admin access to (operational discipline, not code).
   - Bot workflow: beneficiary DMs the bot → chooses/keeps a
     pseudonymous handle (e.g., "песик-3") → requests a gift card →
     operator fulfills manually and pushes the code back through the bot.
   - **No Telegram user IDs, real names, or contact info are stored
     in our main database.** The bot's private chat history is the only
     place this data lives, and the operator does not read it.
   - One optional "share something" prompt at the end of a session
     (e.g., "Got a therapist quote you'd like to share? Reply
     anonymously here."). Stored in the db.
     Not published. Exists so Phase 2 has data to work with.
   - Bot intro text frames the gift as "for sessions with a
     psychologist" — soft framing, not enforcement.

5. **Pseudonymous handle pattern (the core anonymity-C primitive).**
   - Beneficiary is known to the backend by a self-chosen display name/ID.
   - Beneficiary is known to the operator's main system by an opaque
     random ID generated by the backend.
   - Beneficiary tells the operator their handle when requesting a gift
     card; the operator records only the handle in the ledger, never
     any real identifier.
   - The tg bot is the only component that can map handle → real
     identity, and the bot's private channel is not operator-readable.

6. **Single-wallet MVP is acceptable.** Documented as a constraint,
   not a design choice. Recovery procedure, hot/cold split, multi-sig
   are deferred.

7. **Daily anchor job (CI-driven).**
   - A scheduled CI job (GitHub Actions or similar) computes the
     hash of the latest ledger record once per day and publishes it
     to Solana.
   - Wallet key lives in a CI secret, never in code or in the repo.
   - Job is idempotent and retryable; on success it logs the
     transaction signature; on failure it surfaces a clear error
     (the operator notices and can re-run manually if needed).
   - Schedule: once a day, or after every disbursement batch —
     whichever comes first. Cheap on Solana, so the difference is
     just a habit.
   - **Trust model:** the operator holds the key in CI secrets. A
     fully decentralized key (multi-sig, on-chain program) is a
     later upgrade. For MVP, "operator holds the key but the ledger
     history is hash-anchored publicly" is the trust boundary.

### Out of scope for MVP (explicit deferrals)

| Item | Why deferred |
| --- | --- |
| Narrative / marketing / stories layer | MVP donor is just me. No need to over-engineer. Will consult others when external donors arrive. |
| Verification of usage (receipts from Alter) | Stays focused. Could break anonymity if required; we are not even building the opt-in path yet. |
| Therapist vetting | Alter filters therapists before letting them take clients. We are lucky — this is the platform's job, not ours. |
| Referral system / anti-abuse beyond minimum | MVP is small (handful of people). Defer until scaling creates real abuse pressure. |
| Hardened opsec / state-adversary protection | "We are not dealing drugs." Manual processes can be tightened later via a written handbook if needed. |
| Multi-sig / cold storage / wallet recovery procedure | Single-wallet is acceptable at MVP scale. Architecture supports adding later. |
| Matrix / alternative messengers | Telegram bot is the realistic MVP. Matrix is a stretch goal. |
| Psychiatry (vs. psychology) | Explicitly a Phase 2 ask from the original note. |
| Automation of the conversion loop | The "gift card factory" Phase 2 path. MVP is manual by design. |
| Multi-currency / cross-chain | Solana + one stablecoin. Adding chains later is a backend task, not a redesign. |
| Donor accounts, recurring donations, etc. | Donor story is "send to a wallet address." That's it for MVP. |
| Onboarding flow for new beneficiaries (besides DM-the-bot) | MVP beneficiaries are invited personally by the operator. No public signup. |

---

## Key Assumptions to Validate

These are the bets that, if wrong, would invalidate the MVP. The first
two are the most dangerous.

1. **A transparent, receipt-backed ledger is enough to convert crypto
   donors.** *How to test:* launch the site, get 3–5 external donors,
   see if they return. If not, we need the narrative layer sooner.

2. **Alter gift cards can be bought with crypto (directly or via a
   Telegram intermediate) at a cost-effective rate.** *How to test:*
   do the actual conversion manually end-to-end. If fees are > 15%
   or the process is unreliable, the economics of the model collapse.

3. **Beneficiaries will use a Telegram bot for this, and the
   no-identity pattern is acceptable to them.** *How to test:* onboard
   2–3 known beneficiaries, observe. If they refuse or want email/phone
   instead, the channel choice needs revisiting.

4. **A pseudonymous handle ("песик-3") is enough friction to ask
   beneficiaries to remember and repeat back to the operator.** *How
   to test:* in practice. If they forget, the manual workflow breaks.

5. **The operator can sustain the manual loop (withdraw → buy cards →
   record → distribute) without burning out, at current beneficiary
   volume.** *How to test:* time it. If it takes more than ~30
   minutes per beneficiary per month, automation becomes a Phase 1
   priority, not Phase 2.

6. **Russia-context legal exposure for the operator is manageable at
   MVP scale.** *How to test:* informal legal review (already
   deferred to a separate team). Note: this is the assumption most
   likely to invalidate the whole project. Flag to the legal team
   before launch.

---

## Architecture Sketch (pre-spec)

This is a high-level shape, not a technical spec. The technical spec
will be produced via `brainstorming` and `planning-implementation`
skills.

```
                 ┌──────────────────────────────────────────┐
                 │  Public donor site (static, read-only)   │
                 │  - incoming txns from chain              │
                 │  - outgoing gift-card purchases +        │
                 │    receipts (no PII)                     │
                 │  - totals / balance                      │
                 │  - "verify" page: latest anchored hash   │
                 │    + Solscan link + re-verify instructions│
                 └────┬──────────────────┬──────────────────┘
                      │ reads            │ reads
                      ▼                  ▼
   ┌─────────────────────────────┐  ┌──────────────────────┐
   │  Main database (the "vault")│  │  Solana (anchor txns)│
   │  - wallets (table)          │  │  - one tx / day:     │
   │  - donations (incoming)     │  │    hash in memo      │
   │  - disbursements (outgoing: │  │  - Solscan-readable  │
   │    amount, date, count,     │  │  - public, no PII    │
   │    service, receipt ref,    │  └─────────▲────────────┘
   │    beneficiary HANDLE)      │            │
   │  - prev_hash chain (append- │            │ reads
   │    only, no UPDATE/DELETE)  │            │
   │  - NO real identities,      │            │
   │    NO Telegram IDs          │            │
   └────────────▲────────────────┘            │
                │                             │
                │ writes (manual, by op)      │ writes
                │                             │ (CI job, daily)
   ┌────────────┴────────────┐    ┌────────────┴─────────────┐
   │  Operator (me)          │    │  Daily anchor job (CI)  │
   │  - sees handle          │    │  - compute latest hash  │
   │  - publishes receipts   │    │  - sign + send tx       │
   │  - manually buys        │    │  - key in CI secret     │
   │    gift cards           │    │  - log signature        │
   └─────────────────────────┘    └──────────────────────────┘
                ▲
                │ uses same wallet
                │ for donations + anchor

                ┌────────────────────────────────────────┐
                │  Telegram bot (separate account)       │
                │  - operator cannot read                │
                │  - handle ↔ real ID mapping here       │
                │  - optional share prompt (db-stored)   │
                └────────────┬───────────────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Beneficiaries   │
                   │  (Alter users)   │
                   └──────────────────┘
```

**Key separation:** the main database never contains anything that
identifies a beneficiary. The Telegram bot is the *only* place where
real identity maps to handle. The operator workflow crosses both
sides via the handle alone.

**Trust layering:**
- **What the database proves:** that records exist and form a
  consistent append-only chain.
- **What the Solana anchor proves:** that a specific point in that
  chain was published publicly at a specific time, with a specific
  transaction signature.
- **What the public site proves:** that the records and the receipts
  it shows are exactly the ones in the chain, end-to-end.
- **What the Solana anchor does *not* prove:** that the receipts
  are *true* (i.e., that a gift card was actually bought). That
  still relies on the receipt being genuine, which is an
  operational, not a cryptographic, property. Documented honestly
  in the "What this is not" section below.

---

## What This Is Not (honest limits)

A donor reading the architecture might mistakenly conclude that the
on-chain anchor proves more than it does. To be explicit:

- **It does not prove the receipts are real.** A real, published
  receipt (screenshot from Alter, with a valid gift card code) is
  the trust anchor for the off-chain truth. The hash chain proves
  we didn't tamper with what we published; the receipt itself
  proves we didn't fabricate it. Verification of receipt
  authenticity is a future feature (Phase 2) that requires either
  a real Alter API integration or opt-in beneficiary proof — both
  deferred.
- **It does not prove beneficiary identity is protected.** It
  proves that *we* don't link beneficiary handles to real
  identities in the public ledger. It cannot prove what the
  Telegram bot does or does not store in its private channel —
  that's operational discipline plus future bot-side engineering
  (e.g., self-hosted bot, no operator admin access).
- **It does not prove the operator won't lose the key.** A lost
  Solana key means the anchor stops publishing and donors notice.
  That is a *catastrophic but visible* failure mode, not a silent
  one. Better than the alternative, but worth naming.

These limits are documented in the donor-facing FAQ at launch so
expectations match reality.

---

## Notes And Questions

1. **Stablecoin choice:** USDT vs. USDC on Solana for MVP? Multiple?
2. **Donor-facing language:** Russian + English.
3. **Beneficiary display name constraints:** Cyrillic + Latin only.
   Max length? Reserved words? (Should match the bot's UX.)
4. **Receipt publication format:** raw screenshot (anonymized) vs.
   structured record (gift card ID, amount, date)? Probably both —
   structured for the ledger, anonymized screenshot as proof of
   purchase.
5. **Bot hosting:** is this a real bot account on a dedicated phone /
   account, or are we running bot logic in our own backend with
   operator-blind mode enforced by code? (Operator-blind by code is
   stronger but more engineering; operator-blind by discipline is
   faster but fragile.)
6. **Solana RPC provider for the daily anchor job:** public RPC
   (free, occasionally rate-limited) vs. paid (Helius / QuickNode /
   Triton, a few $/month, much more reliable). For MVP, free is
   fine if the script retries. For donor-facing "we publish daily"
   reliability, paid is cheap insurance. Decide at spec.

---

## Next Steps

1. Confirm this concept doc and the open questions above.
2. Run `brainstorming` skill → produce a technical spec.
3. Run `planning-implementation` → produce ordered tasks.
4. Begin implementation in thin verified slices (incremental
   implementation).
5. Validate assumption #2 (end-to-end manual conversion works and
   is cost-effective) **before** writing any non-trivial code.

---

## Change Log

- 2026-06-14: Initial concept doc, captured from ideation session.
- 2026-06-14: Add tamper-evident architecture — hash-chained DB with
  a daily Solana anchor transaction (CI-driven). Adds the "Verify"
  surface on the public site, the daily anchor job to MVP scope, an
  updated architecture sketch, and a "What this is not" section
  documenting the honest limits of the trust story. Solana chosen
  over Ethereum L1 / L2s / Bitcoin for cost, stablecoin story, and
  consumer-wallet ergonomics.
