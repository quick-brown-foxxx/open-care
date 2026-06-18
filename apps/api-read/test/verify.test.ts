import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { seedPublishedAnchor, seedTestData } from './seed.js';

import type { VaultDb } from '@open-care/vault-db';

describe('GET /api/verify', () => {
  let db: VaultDb;

  beforeAll(async () => {
    db = await seedTestData();
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

  /*
  Scenario: Verify endpoint reports a published anchor for the pre-anchor head
    Given the ledger has ordinary events followed by a published anchor seed
    When `/api/verify` is requested
    Then `latest_anchor` is non-null
    And its `memo_text` contains the pre-anchor ledger head hash
    And the endpoint exposes the expected transaction/signature data
  */
  it('returns latest_anchor for the pre-anchor ledger head when a published anchor exists', async () => {
    const anchorSeed = await seedPublishedAnchor(db);

    const response = await SELF.fetch('https://example.com/api/verify');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.latest_anchor).toEqual(
      expect.objectContaining({
        anchored_head_sequence_no: anchorSeed.preAnchorHeadSequenceNo,
        anchored_head_hash: anchorSeed.preAnchorHeadHash,
        tx_signature: anchorSeed.txSignature,
        memo_text: anchorSeed.memoText,
      }),
    );
    expect(json.latest_anchor.memo_text).toContain(anchorSeed.preAnchorHeadHash);
    expect(json.latest_anchor.solscan_url).toContain(anchorSeed.txSignature);
    expect(json.previous_anchors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ anchored_head_hash: anchorSeed.preAnchorHeadHash }),
      ]),
    );
  });
});
