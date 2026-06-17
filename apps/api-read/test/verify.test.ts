import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { seedTestData } from './seed.js';

describe('GET /api/verify', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  it('returns 200 with head info', async () => {
    const response = await SELF.fetch('https://example.com/api/verify');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.head_sequence_no).toBeGreaterThan(0);
    expect(json.head_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns latest_anchor null when no anchor exists', async () => {
    const response = await SELF.fetch('https://example.com/api/verify');
    const json = await response.json();
    expect(json.latest_anchor).toBeNull();
  });

  it('returns previous_anchors as array', async () => {
    const response = await SELF.fetch('https://example.com/api/verify');
    const json = await response.json();
    expect(Array.isArray(json.previous_anchors)).toBe(true);
  });

  it('returns instructions with typescript field', async () => {
    const response = await SELF.fetch('https://example.com/api/verify');
    const json = await response.json();
    expect(json.instructions).toHaveProperty('typescript');
    expect(typeof json.instructions.typescript).toBe('string');
    expect(json.instructions.typescript.length).toBeGreaterThan(100);
  });

  it('returns anchor_stale field', async () => {
    const response = await SELF.fetch('https://example.com/api/verify');
    const json = await response.json();
    expect(json).toHaveProperty('anchor_stale');
  });

  it('returns Cache-Control header', async () => {
    const response = await SELF.fetch('https://example.com/api/verify');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });
});
