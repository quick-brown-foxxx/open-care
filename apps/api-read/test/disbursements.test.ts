import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { seedTestData } from './seed.js';

describe('GET /api/disbursements', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  it('returns 200 with disbursement items', async () => {
    const response = await SELF.fetch('https://example.com/api/disbursements');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.items.length).toBeGreaterThan(0);
    const disbursement = json.items[0];
    expect(disbursement.sequence_no).toBe(2);
    expect(disbursement.amount_usdc_minor).toBe('50000000');
    expect(disbursement.gift_card_count).toBe(2);
    expect(disbursement.service).toBe('Alter');
    expect(disbursement.receipt_ref).toBe('ALTER-2026-06-14-A1B2C3');
    expect(disbursement.public_beneficiary_ref).toBe('benpub_A2B3C4D5E6F7G2H3');
  });

  it('supports pagination with after_sequence_no', async () => {
    const response = await SELF.fetch('https://example.com/api/disbursements?after_sequence_no=2');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.items.length).toBe(0);
    expect(json.next_cursor).toBeNull();
  });

  it('returns 400 for invalid after_sequence_no', async () => {
    const response = await SELF.fetch('https://example.com/api/disbursements?after_sequence_no=-1');
    expect(response.status).toBe(400);
  });

  it('returns Cache-Control header', async () => {
    const response = await SELF.fetch('https://example.com/api/disbursements');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });
});
