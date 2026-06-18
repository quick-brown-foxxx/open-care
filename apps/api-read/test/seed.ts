import { env } from 'cloudflare:test';
import { createVaultDb, appendLedgerEvent, getHead } from '@open-care/vault-db';
import { anchorRuns } from '@open-care/vault-db/schema/vault-db';
import { buildAnchorMemo, utcNow } from '@open-care/vault-core';
import type { VaultDb } from '@open-care/vault-db';

const ANCHOR_TX_SIGNATURE =
  '5Jofwx5DPe1qBwHL7hN3VpFqLxqFj4mJLo5iY7nP8kRt2sT9uVvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234';

export interface PublishedAnchorSeed {
  preAnchorHeadSequenceNo: number;
  preAnchorHeadHash: string;
  anchorEventSequenceNo: number;
  anchorEventHash: string;
  memoText: string;
  txSignature: string;
  publishedAtUtc: string;
}

/**
 * Seed the test database with sample ledger events.
 * Returns the VaultDb instance for further queries.
 */
export async function seedTestData(): Promise<VaultDb> {
  const db = createVaultDb(env.vault_db);

  // Seed a donation
  const donationResult = await appendLedgerEvent(db, {
    event_type: 'donation_confirmed',
    payload: {
      cluster: 'devnet',
      usdc_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      treasury_wallet_address: '8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG',
      vault_usdc_ata: '52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG',
      tx_signature:
        '5Jofwx5DPe1qBwHL7hN3VpFqLxqFj4mJLo5iY7nP8kRt2sT9uVvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234',
      transaction_version: 0,
      instruction_index: 0,
      inner_index: null,
      slot: 123456789,
      block_time_utc: '2026-06-14T10:23:00Z',
      amount_usdc_minor: '100000000',
    },
    created_at_utc: '2026-06-14T10:23:01Z',
  });
  if (!donationResult.ok) {
    throw new Error(`Failed to seed donation: ${donationResult.error.message}`);
  }

  // Seed a disbursement
  const disbursementResult = await appendLedgerEvent(db, {
    event_type: 'disbursement_recorded',
    payload: {
      amount_usdc_minor: '50000000',
      gift_card_count: 2,
      service: 'Alter',
      service_note: null,
      receipt_ref: 'ALTER-2026-06-14-A1B2C3',
      public_beneficiary_ref: 'benpub_A2B3C4D5E6F7G2H3',
      purchased_at_utc: '2026-06-14T10:23:00Z',
      recorded_at_utc: '2026-06-14T10:25:14Z',
      recorded_by: 'test-operator',
    },
    created_at_utc: '2026-06-14T10:25:14Z',
  });
  if (!disbursementResult.ok) {
    throw new Error(`Failed to seed disbursement: ${disbursementResult.error.message}`);
  }

  return db;
}

/**
 * Seed a published anchor for the current pre-anchor ledger head.
 *
 * This mirrors the production anchor shape: `anchor_runs` records the head that
 * was anchored, then an `anchor_published` ledger event is appended after that
 * pre-anchor head.
 */
export async function seedPublishedAnchor(db: VaultDb): Promise<PublishedAnchorSeed> {
  const preAnchorHead = await getHead(db);
  if (!preAnchorHead) {
    throw new Error('Cannot seed a published anchor without existing ledger events');
  }

  const publishedAtUtc = utcNow();
  const anchorDate = publishedAtUtc.slice(0, 10);
  const memoText = buildAnchorMemo(preAnchorHead.event_hash);

  await db.insert(anchorRuns).values({
    anchor_date: anchorDate,
    anchored_head_sequence_no: preAnchorHead.sequence_no,
    anchored_head_hash: preAnchorHead.event_hash,
    status: 'published',
    trigger_source: 'cron',
    tx_signature: ANCHOR_TX_SIGNATURE,
    anchor_wallet_address: env.ANCHOR_WALLET_ADDRESS,
    memo_text: memoText,
    attempt_count: 1,
    last_error: null,
    locked_until_utc: null,
    last_anchor_wallet_sol_lamports: 1_000_000_000,
    created_at_utc: publishedAtUtc,
    updated_at_utc: publishedAtUtc,
  });

  const anchorEventResult = await appendLedgerEvent(db, {
    event_type: 'anchor_published',
    payload: {
      anchor_date: anchorDate,
      anchored_head_sequence_no: preAnchorHead.sequence_no,
      anchored_head_hash: preAnchorHead.event_hash,
      tx_signature: ANCHOR_TX_SIGNATURE,
      anchor_wallet_address: env.ANCHOR_WALLET_ADDRESS,
      memo_text: memoText,
      published_at_utc: publishedAtUtc,
      cluster: 'devnet',
    },
    created_at_utc: publishedAtUtc,
  });

  if (!anchorEventResult.ok) {
    throw new Error(`Failed to seed anchor event: ${anchorEventResult.error.message}`);
  }

  return {
    preAnchorHeadSequenceNo: preAnchorHead.sequence_no,
    preAnchorHeadHash: preAnchorHead.event_hash,
    anchorEventSequenceNo: anchorEventResult.value.sequence_no,
    anchorEventHash: anchorEventResult.value.event_hash,
    memoText,
    txSignature: ANCHOR_TX_SIGNATURE,
    publishedAtUtc,
  };
}
