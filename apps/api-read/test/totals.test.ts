import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { seedPublishedAnchor, seedTestData } from './seed.js';

import type { VaultDb } from '@open-care/vault-db';

describe('GET /api/totals', () => {
  let db: VaultDb;

  beforeAll(async () => {
    db = await seedTestData();
  });

  it('returns 200 with correct aggregates', async () => {
    const response = await SELF.fetch('https://example.com/api/totals');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.total_in_usdc_minor).toBe('100000000');
    expect(json.total_out_usdc_minor).toBe('50000000');
    expect(json.balance_usdc_minor).toBe('50000000');
    expect(json.donations_count).toBe(1);
    expect(json.disbursements_count).toBe(1);
  });

  it('returns null anchor when no anchor exists', async () => {
    const response = await SELF.fetch('https://example.com/api/totals');
    const json = await response.json();
    expect(json.anchor).toBeNull();
  });

  it('returns anchor_stale and anchor_wallet_low_sol fields', async () => {
    const response = await SELF.fetch('https://example.com/api/totals');
    const json = await response.json();
    expect(json).toHaveProperty('anchor_stale');
    expect(json).toHaveProperty('anchor_wallet_low_sol');
    expect(json.anchor_wallet_low_sol).toBe(false);
    expect(json.anchor_stale).toBe(true);
  });

  it('returns Cache-Control header', async () => {
    const response = await SELF.fetch('https://example.com/api/totals');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  /*
  Scenario: Anchor-present public read paths expose non-null anchor data
    Given a published anchor seed exists
    When `/api/totals` is requested
    Then the endpoint's anchor-related non-null path is exercised according to existing contracts
  */
  it('returns non-null anchor fields when a published anchor exists', async () => {
    const anchorSeed = await seedPublishedAnchor(db);

    const response = await SELF.fetch('https://example.com/api/totals');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.anchor).toEqual(
      expect.objectContaining({
        anchored_head_hash: anchorSeed.preAnchorHeadHash,
        tx_signature: anchorSeed.txSignature,
        anchor_wallet_address: expect.any(String),
      }),
    );
    expect(json.anchor.solscan_url).toContain(anchorSeed.txSignature);
    expect(json.anchor_stale).toBe(false);
    expect(json.anchor_wallet_low_sol).toBe(false);
  });
});
