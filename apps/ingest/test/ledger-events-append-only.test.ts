import { env } from 'cloudflare:test';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { appendLedgerEvent, createVaultDb, vaultSchema } from '@open-care/vault-db';
import type { DonationPayload } from '@open-care/vault-core';
import { resetLedgerEventsForTest } from './reset-ledger-events.js';
import type { Env } from '../src/lib/env.js';

function makeDonationPayload(testEnv: Env, txSignature: string): DonationPayload {
  return {
    cluster: 'devnet',
    usdc_mint: testEnv.USDC_MINT,
    treasury_wallet_address: testEnv.TREASURY_WALLET_ADDRESS,
    vault_usdc_ata: testEnv.VAULT_USDC_ATA,
    tx_signature: txSignature,
    transaction_version: 0,
    instruction_index: 0,
    inner_index: null,
    slot: 123456789,
    block_time_utc: '2026-06-14T10:23:00Z',
    amount_usdc_minor: '100000000',
  };
}

describe('ledger_events append-only migration triggers', () => {
  let db: ReturnType<typeof createVaultDb>;
  let testEnv: Env;

  beforeAll(() => {
    testEnv = env;
    db = createVaultDb(testEnv.vault_db);
  });

  beforeEach(async () => {
    await resetLedgerEventsForTest(db);
  });

  /*
  Scenario: DELETE is blocked after D1 migrations install append-only triggers
    Given the migrated vault database contains a ledger event
    When test code attempts db.delete(ledgerEvents)
    Then SQLite rejects the mutation
    And the ledger event remains persisted
  */
  it('rejects Drizzle DELETE mutations against ledger_events', async () => {
    const appendResult = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: makeDonationPayload(testEnv, 'delete-trigger-test111111111111111111111111111111'),
      created_at_utc: '2026-06-14T10:23:01Z',
    });
    expect(appendResult.ok).toBe(true);
    if (!appendResult.ok) {
      throw new Error(`Expected ledger append to succeed: ${appendResult.error.message}`);
    }

    await expect(
      db
        .delete(vaultSchema.ledgerEvents)
        .where(eq(vaultSchema.ledgerEvents.event_hash, appendResult.value.event_hash)),
    ).rejects.toThrow();

    const remainingRows = await db.select().from(vaultSchema.ledgerEvents);
    expect(remainingRows.length).toBe(1);
  });

  /*
  Scenario: UPDATE is blocked after D1 migrations install append-only triggers
    Given the migrated vault database contains a ledger event
    When test code attempts db.update(ledgerEvents).set(...)
    Then SQLite rejects the mutation
    And the original ledger event remains unchanged
  */
  it('rejects Drizzle UPDATE mutations against ledger_events', async () => {
    const appendResult = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: makeDonationPayload(testEnv, 'update-trigger-test111111111111111111111111111111'),
      created_at_utc: '2026-06-14T10:23:01Z',
    });
    expect(appendResult.ok).toBe(true);
    if (!appendResult.ok) {
      throw new Error(`Expected ledger append to succeed: ${appendResult.error.message}`);
    }

    await expect(
      db
        .update(vaultSchema.ledgerEvents)
        .set({ payload_json: '{}' })
        .where(eq(vaultSchema.ledgerEvents.event_hash, appendResult.value.event_hash)),
    ).rejects.toThrow();

    const [remainingRow] = await db.select().from(vaultSchema.ledgerEvents);
    expect(remainingRow?.event_hash).toBe(appendResult.value.event_hash);
    expect(remainingRow?.payload_json).not.toBe('{}');
  });
});
