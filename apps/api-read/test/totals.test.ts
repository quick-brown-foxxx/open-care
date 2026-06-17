import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { seedTestData } from './seed.js';

describe('GET /api/totals', () => {
  beforeAll(async () => {
    await seedTestData();
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
});
