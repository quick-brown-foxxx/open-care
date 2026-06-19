import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { TotalsResponseSchema } from './totals.js';
import { DonationsResponseSchema } from './donations.js';
import { DisbursementsResponseSchema } from './disbursements.js';
import { LedgerEventsResponseSchema } from './ledger-events.js';
import { VerifyResponseSchema } from './verify.js';
import { HealthResponseSchema } from './health.js';

// ---------------------------------------------------------------------------
// Empty-ledger acceptance — regression tests to ensure schemas accept the
// shapes the API returns when the ledger has no data.
// ---------------------------------------------------------------------------

describe('Schema empty-ledger acceptance', () => {
  it('TotalsResponseSchema accepts empty-ledger response', () => {
    const data = {
      total_in_usdc_minor: '0',
      total_out_usdc_minor: '0',
      balance_usdc_minor: '0',
      donations_count: 0,
      disbursements_count: 0,
      anchor: null,
      anchor_stale: true,
      anchor_wallet_low_sol: false,
    };
    const result = v.safeParse(TotalsResponseSchema, data);
    expect(result.success).toBe(true);
  });

  it('DonationsResponseSchema accepts empty-ledger response', () => {
    const data = { items: [], next_cursor: null };
    const result = v.safeParse(DonationsResponseSchema, data);
    expect(result.success).toBe(true);
  });

  it('DisbursementsResponseSchema accepts empty-ledger response', () => {
    const data = { items: [], next_cursor: null };
    const result = v.safeParse(DisbursementsResponseSchema, data);
    expect(result.success).toBe(true);
  });

  it('LedgerEventsResponseSchema accepts empty-ledger response', () => {
    const data = { items: [], next_after_sequence_no: null };
    const result = v.safeParse(LedgerEventsResponseSchema, data);
    expect(result.success).toBe(true);
  });

  it('VerifyResponseSchema accepts empty-ledger response', () => {
    const data = {
      head_sequence_no: null,
      head_hash: null,
      latest_anchor: null,
      previous_anchors: [],
      instructions: { typescript: '// verification code here' },
      anchor_stale: true,
    };
    const result = v.safeParse(VerifyResponseSchema, data);
    expect(result.success).toBe(true);
  });

  it('HealthResponseSchema accepts degraded status', () => {
    const data = {
      status: 'degraded',
      version: '0.1.0-dev',
      response_time_ms: 42,
      checks: {
        db_reachable: true,
        anchor_stale: true,
        anchor_wallet_low_sol: false,
        ingest_recent_or_empty: true,
        helius_inbox_backlog_ok: true,
      },
      contact_url: null,
    };
    const result = v.safeParse(HealthResponseSchema, data);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Non-empty VerifyResponse — ensures the nullable fix didn't break the
// normal (populated ledger) case.
// ---------------------------------------------------------------------------

describe('VerifyResponseSchema non-empty acceptance', () => {
  it('accepts a normal (populated) response', () => {
    const data = {
      head_sequence_no: 5,
      head_hash: 'a'.repeat(64),
      latest_anchor: {
        anchor_date: '2026-06-17',
        anchored_head_sequence_no: 3,
        anchored_head_hash: 'b'.repeat(64),
        tx_signature: '5JXbase58signature11111111111111111111111111',
        anchor_wallet_address: 'Anchbase58address111111111111111111111111111',
        memo_text: 'ccv-anchor:' + 'c'.repeat(64),
        published_at_utc: '2026-06-17T01:00:00Z',
        solscan_url: 'https://solscan.io/tx/5JXbase58signature11111111111111111111111111',
      },
      previous_anchors: [],
      instructions: { typescript: '// code' },
      anchor_stale: false,
    };
    const result = v.safeParse(VerifyResponseSchema, data);
    expect(result.success).toBe(true);
  });

  it('accepts a response with multiple previous anchors', () => {
    const anchor = {
      anchor_date: '2026-06-16',
      anchored_head_sequence_no: 2,
      anchored_head_hash: 'd'.repeat(64),
      tx_signature: '4KXbase58signature22222222222222222222222222',
      anchor_wallet_address: 'Anchbase58address222222222222222222222222222',
      memo_text: 'ccv-anchor:' + 'e'.repeat(64),
      published_at_utc: '2026-06-16T01:00:00Z',
      solscan_url: 'https://solscan.io/tx/4KXbase58signature22222222222222222222222222',
    };
    const data = {
      head_sequence_no: 5,
      head_hash: 'a'.repeat(64),
      latest_anchor: {
        anchor_date: '2026-06-17',
        anchored_head_sequence_no: 3,
        anchored_head_hash: 'b'.repeat(64),
        tx_signature: '5JXbase58signature11111111111111111111111111',
        anchor_wallet_address: 'Anchbase58address111111111111111111111111111',
        memo_text: 'ccv-anchor:' + 'c'.repeat(64),
        published_at_utc: '2026-06-17T01:00:00Z',
        solscan_url: 'https://solscan.io/tx/5JXbase58signature11111111111111111111111111',
      },
      previous_anchors: [anchor],
      instructions: { typescript: '// code' },
      anchor_stale: false,
    };
    const result = v.safeParse(VerifyResponseSchema, data);
    expect(result.success).toBe(true);
  });
});
