#!/usr/bin/env tsx
/**
 * Generates a D1 seed migration SQL file for vault-db.
 * Computes correct SHA-256 hashes for each ledger event using computeEventHash(),
 * producing a valid hash chain.
 *
 * Usage: tsx src/generate-vault-seed.ts > ../../apps/ingest/migrations/0002_seed.sql
 */

import { computeEventHash, canonicalJson, ZERO_HASH } from '@open-care/vault-core';
import type {
  LedgerEventBase,
  DonationPayload,
  DisbursementPayload,
  AnchorPayload,
  CorrectionPayload,
} from '@open-care/vault-core';

// ---------------------------------------------------------------------------
// Seed event definitions (in chain order)
// ---------------------------------------------------------------------------

const donation1: LedgerEventBase = {
  sequence_no: 1,
  event_type: 'donation_confirmed',
  payload: {
    cluster: 'devnet',
    usdc_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    treasury_wallet_address: '8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG',
    vault_usdc_ata: '52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG',
    tx_signature: '5xAbC1234mockTestVectorDonationConfirmedExample',
    transaction_version: 0,
    instruction_index: 3,
    inner_index: null,
    slot: 123456789,
    block_time_utc: '2026-06-14T10:23:00Z',
    amount_usdc_minor: '100000000',
  } satisfies DonationPayload,
  prev_hash: ZERO_HASH,
  created_at_utc: '2026-06-14T10:23:01Z',
};

const donation2: LedgerEventBase = {
  sequence_no: 2,
  event_type: 'donation_confirmed',
  payload: {
    cluster: 'devnet',
    usdc_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    treasury_wallet_address: '8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG',
    vault_usdc_ata: '52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG',
    tx_signature: '3mDcF5678seedDonationTwoDevnetExampleTx',
    transaction_version: 0,
    instruction_index: 1,
    inner_index: null,
    slot: 123456790,
    block_time_utc: '2026-06-14T11:00:00Z',
    amount_usdc_minor: '50000000',
  } satisfies DonationPayload,
  prev_hash: 'WILL_BE_REPLACED', // replaced after donation1 hash is computed
  created_at_utc: '2026-06-14T11:00:01Z',
};

const donation3: LedgerEventBase = {
  sequence_no: 3,
  event_type: 'donation_confirmed',
  payload: {
    cluster: 'devnet',
    usdc_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    treasury_wallet_address: '8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG',
    vault_usdc_ata: '52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG',
    tx_signature: '9kGhJ9012seedDonationThreeDevnetExampleTx',
    transaction_version: 0,
    instruction_index: 2,
    inner_index: 0,
    slot: 123456791,
    block_time_utc: '2026-06-14T12:00:00Z',
    amount_usdc_minor: '25000000',
  } satisfies DonationPayload,
  prev_hash: 'WILL_BE_REPLACED',
  created_at_utc: '2026-06-14T12:00:01Z',
};

const disbursement1: LedgerEventBase = {
  sequence_no: 4,
  event_type: 'disbursement_recorded',
  payload: {
    amount_usdc_minor: '75000000',
    gift_card_count: 3,
    service: 'Alter',
    service_note: 'Q2 2026 mental health support program',
    receipt_ref: 'RCPT-2026-001',
    public_beneficiary_ref: 'benpub_7G9Q2KX4N5P8R2T6',
    purchased_at_utc: '2026-06-15T09:00:00Z',
    recorded_at_utc: '2026-06-15T09:30:00Z',
    recorded_by: 'operator',
  } satisfies DisbursementPayload,
  prev_hash: 'WILL_BE_REPLACED',
  created_at_utc: '2026-06-15T09:30:00Z',
};

const disbursement2: LedgerEventBase = {
  sequence_no: 5,
  event_type: 'disbursement_recorded',
  payload: {
    amount_usdc_minor: '30000000',
    gift_card_count: 1,
    service: 'Yasno',
    service_note: null,
    receipt_ref: 'RCPT-2026-002',
    public_beneficiary_ref: null,
    purchased_at_utc: '2026-06-15T14:00:00Z',
    recorded_at_utc: '2026-06-15T14:15:00Z',
    recorded_by: 'operator',
  } satisfies DisbursementPayload,
  prev_hash: 'WILL_BE_REPLACED',
  created_at_utc: '2026-06-15T14:15:00Z',
};

const anchor: LedgerEventBase = {
  sequence_no: 6,
  event_type: 'anchor_published',
  payload: {
    anchor_date: '2026-06-15',
    anchored_head_sequence_no: 5,
    anchored_head_hash: 'WILL_BE_REPLACED', // hash of disbursement2
    tx_signature: '7nOpQ3456seedAnchorDevnetExampleTx',
    anchor_wallet_address: 'BhKtkM1oHADwo8ap5P6Lymj7b3iaspiAm37RA9KMn8YG',
    memo_text: 'open-care.org anchor 2026-06-15 seq=5',
    published_at_utc: '2026-06-16T01:00:00Z',
    cluster: 'devnet',
  } satisfies AnchorPayload,
  prev_hash: 'WILL_BE_REPLACED',
  created_at_utc: '2026-06-16T01:00:00Z',
};

const correction: LedgerEventBase = {
  sequence_no: 7,
  event_type: 'correction_recorded',
  payload: {
    corrects_sequence_no: 4,
    reason: 'Receipt reference was incorrect; updated after vendor confirmation',
    replacement_fields: {
      receipt_ref: 'RCPT-2026-001-CORRECTED',
    },
    recorded_at_utc: '2026-06-16T10:00:00Z',
    recorded_by: 'operator',
  } satisfies CorrectionPayload,
  prev_hash: 'WILL_BE_REPLACED',
  created_at_utc: '2026-06-16T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Compute hashes sequentially to build a valid chain
// ---------------------------------------------------------------------------

const events = [donation1, donation2, donation3, disbursement1, disbursement2, anchor, correction];
const hashes: string[] = [];

for (let i = 0; i < events.length; i++) {
  const event = events[i]!;
  // Set prev_hash: first event uses ZERO_HASH, others use previous event's hash
  if (i === 0) {
    event.prev_hash = ZERO_HASH;
  } else {
    event.prev_hash = hashes[i - 1]!;
  }

  // For anchor event, set anchored_head_hash to the hash of the head being anchored
  if (event.event_type === 'anchor_published') {
    const anchorPayload = event.payload as AnchorPayload;
    anchorPayload.anchored_head_hash = hashes[4]!; // hash of disbursement2 (seq=5)
  }

  const hash = await computeEventHash(event);
  hashes.push(hash);
}

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------

function sqlString(s: string): string {
  // Escape single quotes by doubling them
  return `'${s.replace(/'/g, "''")}'`;
}

const lines: string[] = [];

// Header
lines.push('-- Seed data for vault-db (local development)');
lines.push('-- Generated by tools/seed/src/generate-vault-seed.ts');
lines.push('-- All event hashes are pre-computed to form a valid hash chain.');
lines.push('');

// Wallets
lines.push('-- Wallets');
lines.push(
  `INSERT INTO wallets (role, cluster, address, usdc_mint, usdc_ata, label, active, created_at_utc) VALUES`,
);
lines.push(
  `  ('treasury', 'devnet', ${sqlString('8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG')}, ${sqlString('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')}, ${sqlString('52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG')}, ${sqlString('Treasury (devnet)')}, 1, ${sqlString('2026-06-14T00:00:00Z')});`,
);
lines.push(
  `INSERT INTO wallets (role, cluster, address, usdc_mint, usdc_ata, label, active, created_at_utc) VALUES`,
);
lines.push(
  `  ('anchor', 'devnet', ${sqlString('BhKtkM1oHADwo8ap5P6Lymj7b3iaspiAm37RA9KMn8YG')}, NULL, NULL, ${sqlString('Anchor (devnet)')}, 1, ${sqlString('2026-06-14T00:00:00Z')});`,
);
lines.push('');

// Ledger events
lines.push('-- Ledger events (valid hash chain)');
lines.push('');

for (let i = 0; i < events.length; i++) {
  const event = events[i]!;
  const hash = hashes[i]!;
  const payloadJson = canonicalJson(event.payload);

  lines.push(`-- Event ${i + 1}: ${event.event_type} (seq=${event.sequence_no})`);
  lines.push(
    `INSERT INTO ledger_events (event_type, payload_json, prev_hash, event_hash, created_at_utc) VALUES`,
  );
  lines.push(
    `  (${sqlString(event.event_type)}, ${sqlString(payloadJson)}, ${sqlString(event.prev_hash)}, ${sqlString(hash)}, ${sqlString(event.created_at_utc)});`,
  );
  lines.push('');
}

// Anchor runs
lines.push('-- Anchor runs');
lines.push(
  `INSERT INTO anchor_runs (anchor_date, anchored_head_sequence_no, anchored_head_hash, status, trigger_source, tx_signature, anchor_wallet_address, memo_text, attempt_count, last_error, locked_until_utc, last_anchor_wallet_sol_lamports, created_at_utc, updated_at_utc) VALUES`,
);
lines.push(
  `  ('2026-06-15', 5, ${sqlString(hashes[4]!)}, 'published', 'cron', ${sqlString('7nOpQ3456seedAnchorDevnetExampleTx')}, ${sqlString('BhKtkM1oHADwo8ap5P6Lymj7b3iaspiAm37RA9KMn8YG')}, ${sqlString('open-care.org anchor 2026-06-15 seq=5')}, 1, NULL, NULL, 5000000000, ${sqlString('2026-06-16T01:00:00Z')}, ${sqlString('2026-06-16T01:00:00Z')});`,
);
lines.push('');

// Summary comment
lines.push('-- Seed data summary:');
lines.push('--   3 donations: 100 + 50 + 25 = 175 USDC total');
lines.push('--   2 disbursements: 75 + 30 = 105 USDC total');
lines.push('--   1 anchor (published, cron-triggered)');
lines.push('--   1 correction (receipt_ref fix on disbursement #1)');
lines.push('--   2 wallets: treasury + anchor (devnet)');
lines.push('--   1 anchor_runs row');
lines.push('--   Net unspent: 175 - 105 = 70 USDC');
lines.push('');

// Output
process.stdout.write(lines.join('\n'));
