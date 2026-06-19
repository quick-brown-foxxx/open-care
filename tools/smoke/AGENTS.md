# tools/smoke — Agent Notes

## Role

Standalone smoke-test tooling for deployed Open Care environments and explicit
live Solana devnet checks.

## What lives here

| File              | Role                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `smoke-test.sh`   | Shell smoke test for public staging/production API and frontend endpoints.                                        |
| `devnet-smoke.ts` | Environment-gated live devnet smoke that sends a Memo anchor and tiny USDC transfer, then verifies finalized txs. |

## Connections

### Depends on

- Public HTTP deployment endpoints for `smoke-test.sh`.
- Solana devnet RPC for `devnet-smoke.ts`.
- `@solana/web3.js`, `@solana/spl-token`, and `bs58` for live devnet transaction handling.

### Not connected to

- D1 bindings, Worker service bindings, operator tokens, Telegram bot state, or
  mainnet treasury custody.

## Key invariants

- Live devnet smoke is fail-closed behind `ALLOW_DEVNET_SMOKE=true` and
  `SOLANA_CLUSTER=devnet`.
- The devnet script must verify the RPC endpoint's genesis hash is Solana devnet
  before any transaction signing or sending.
- `VAULT_USDC_ATA` must derive from `TREASURY_WALLET_ADDRESS` + `USDC_MINT`, and
  the on-chain token account owner must match the treasury address.
- The devnet script prints only public addresses/signatures and redacts RPC query
  strings to avoid leaking API keys.
- The devnet script must never use or request mainnet/private treasury keys; use
  only explicitly provided devnet throwaway/faucet-funded wallets.
- Live devnet smoke is manual/operator tooling and is not part of PR CI.
