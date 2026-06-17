import { env } from 'cloudflare:test';
import { createVaultDb, appendLedgerEvent } from '@open-care/vault-db';
import type { VaultDb } from '@open-care/vault-db';

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
