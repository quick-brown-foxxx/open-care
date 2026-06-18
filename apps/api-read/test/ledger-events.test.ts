import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { seedTestData } from './seed.js';
import { createVaultDb, appendLedgerEvent } from '@open-care/vault-db';
import { canonicalJson } from '@open-care/vault-core';
import type { DonationPayload } from '@open-care/vault-core';

describe('GET /api/ledger-events', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  it('returns 200 with ledger events', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.items.length).toBeGreaterThanOrEqual(2);
    const first = json.items[0];
    expect(first.sequence_no).toBe(1);
    expect(first.event_type).toBe('donation_confirmed');
    // payload_json must be a string (raw JSON), not an object
    expect(typeof first.payload_json).toBe('string');
    expect(first.event_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.prev_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('payload_json is valid JSON that can be parsed', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    const json = await response.json();
    const parsed = JSON.parse(json.items[0].payload_json);
    expect(parsed).toHaveProperty('amount_usdc_minor');
  });

  it('payload_json never contains donor_memo (I-6)', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    const json = await response.json();
    for (const item of json.items) {
      const parsed = JSON.parse(item.payload_json);
      expect(parsed).not.toHaveProperty('donor_memo');
    }
  });

  it('supports limit query param', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events?limit=1');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.items.length).toBe(1);
  });

  it('returns 400 for invalid limit', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events?limit=0');
    expect(response.status).toBe(400);
  });

  it('returns 400 for limit exceeding max (1000)', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events?limit=1001');
    expect(response.status).toBe(400);
  });

  it('returns Cache-Control header', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });
});

describe('Bivalent read: corrections do not modify original event payloads', () => {
  const originalDonationPayload: DonationPayload = {
    cluster: 'devnet',
    usdc_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    treasury_wallet_address: '8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG',
    vault_usdc_ata: '52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG',
    tx_signature: 'bivalentTestDonationSignature1234567890abcdef',
    transaction_version: 0,
    instruction_index: 0,
    inner_index: null,
    slot: 999999999,
    block_time_utc: '2026-06-15T10:00:00Z',
    amount_usdc_minor: '75000000',
  };

  const expectedPayloadJson = canonicalJson(originalDonationPayload);

  let donationSequenceNo: number;

  beforeAll(async () => {
    // Seed a fresh donation event
    const db = createVaultDb(env.vault_db);
    const donationResult = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: originalDonationPayload,
      created_at_utc: '2026-06-15T10:00:01Z',
    });
    if (!donationResult.ok) {
      throw new Error(`Failed to seed bivalent donation: ${donationResult.error.message}`);
    }
    donationSequenceNo = donationResult.value.sequence_no;

    // Seed a correction that references the donation
    const correctionResult = await appendLedgerEvent(db, {
      event_type: 'correction_recorded',
      payload: {
        corrects_sequence_no: donationSequenceNo,
        reason: 'Fix receipt reference for bivalent test',
        replacement_fields: { receipt_ref: 'BIVALENT-CORRECTED-REF' },
        recorded_at_utc: '2026-06-15T10:05:00Z',
        recorded_by: 'bivalent-test',
      },
      created_at_utc: '2026-06-15T10:05:01Z',
    });
    if (!correctionResult.ok) {
      throw new Error(`Failed to seed bivalent correction: ${correctionResult.error.message}`);
    }
  });

  it('original donation payload_json is unchanged after correction', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    expect(response.status).toBe(200);
    const json = await response.json<{ items: { sequence_no: number; payload_json: string }[] }>();

    // Find the original donation event
    const donation = json.items.find(
      (item: { sequence_no: number }) => item.sequence_no === donationSequenceNo,
    );
    expect(donation).toBeDefined();

    // The payload_json must match the canonical JSON of the original payload byte-for-byte
    expect(donation!.payload_json).toBe(expectedPayloadJson);
  });

  it('correction event exists and has its own payload_json', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    expect(response.status).toBe(200);
    const json = await response.json<{
      items: { sequence_no: number; event_type: string; payload_json: string }[];
    }>();

    // Find the correction event (it should be the last event)
    const correction = json.items.find(
      (item: { event_type: string }) => item.event_type === 'correction_recorded',
    );
    expect(correction).toBeDefined();
    expect(typeof correction!.payload_json).toBe('string');

    // The correction payload should contain corrects_sequence_no pointing to the donation
    const parsed = JSON.parse(correction!.payload_json) as { corrects_sequence_no: number };
    expect(parsed.corrects_sequence_no).toBe(donationSequenceNo);
  });

  it('original donation payload_json can be parsed back to the original payload', async () => {
    const response = await SELF.fetch('https://example.com/api/ledger-events');
    expect(response.status).toBe(200);
    const json = await response.json<{ items: { sequence_no: number; payload_json: string }[] }>();

    const donation = json.items.find(
      (item: { sequence_no: number }) => item.sequence_no === donationSequenceNo,
    );
    expect(donation).toBeDefined();

    // Parse the payload_json and verify key fields match the original
    const parsed = JSON.parse(donation!.payload_json) as Record<string, unknown>;
    expect(parsed.amount_usdc_minor).toBe('75000000');
    expect(parsed.tx_signature).toBe('bivalentTestDonationSignature1234567890abcdef');
    expect(parsed.slot).toBe(999999999);
    expect(parsed.cluster).toBe('devnet');
  });
});
