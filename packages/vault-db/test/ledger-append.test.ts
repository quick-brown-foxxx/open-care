import { describe, it, expect, beforeEach } from 'vitest';
import { createTestVaultDb } from './setup.js';
import { appendLedgerEvent, getEventsPaginated } from '../src/index.js';
import { ZERO_HASH, computeEventHash, isDonationPayload, verifyChain } from '@open-care/vault-core';
import type {
  AnchorPayload,
  CorrectionPayload,
  DisbursementPayload,
  DonationPayload,
  LedgerEvent,
  LedgerEventBase,
} from '@open-care/vault-core';
import type { AppendLedgerEventInput } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDonationPayload(overrides?: Partial<DonationPayload>): DonationPayload {
  return {
    cluster: 'devnet',
    usdc_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    treasury_wallet_address: 'treasury1111111111111111111111111111111111', // 44 chars
    vault_usdc_ata: 'vault11111111111111111111111111111111111111', // 44 chars
    tx_signature: '5K4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z5k4z',
    transaction_version: 0,
    instruction_index: 0,
    inner_index: null,
    slot: 100,
    block_time_utc: '2025-01-15T10:30:00Z',
    amount_usdc_minor: '1000000', // 1 USDC
    ...overrides,
  };
}

function makeDisbursementPayload(overrides?: Partial<DisbursementPayload>): DisbursementPayload {
  return {
    amount_usdc_minor: '2500000',
    gift_card_count: 1,
    service: 'Alter',
    service_note: null,
    receipt_ref: 'ALTER-2025-001',
    public_beneficiary_ref: 'benpub_A2B3C4D5E6F7G2H3',
    purchased_at_utc: '2025-01-15T10:35:00Z',
    recorded_at_utc: '2025-01-15T10:36:00Z',
    recorded_by: 'test-operator',
    ...overrides,
  };
}

function makeAnchorPayload(overrides?: Partial<AnchorPayload>): AnchorPayload {
  const anchoredHeadHash = overrides?.anchored_head_hash ?? 'a'.repeat(64);

  return {
    anchor_date: '2025-01-16',
    anchored_head_sequence_no: 1,
    anchored_head_hash: anchoredHeadHash,
    tx_signature:
      '5Jofwx5DPe1qBwHL7hN3VpFqLxqFj4mJLo5iY7nP8kRt2sT9uVvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234',
    anchor_wallet_address: 'BhKtkM1oHADwo8ap5P6Lymj7b3iaspiAm37RA9KMn8YG',
    memo_text: `ccv-anchor:${anchoredHeadHash}`,
    published_at_utc: '2025-01-16T01:00:00Z',
    cluster: 'devnet',
    ...overrides,
  };
}

function makeCorrectionPayload(overrides?: Partial<CorrectionPayload>): CorrectionPayload {
  return {
    corrects_sequence_no: 1,
    reason: 'Receipt reference corrected after vendor confirmation',
    replacement_fields: {
      receipt_ref: 'ALTER-2025-001-CORRECTED',
    },
    recorded_at_utc: '2025-01-16T10:00:00Z',
    recorded_by: 'test-operator',
    ...overrides,
  };
}

async function appendOk(
  db: ReturnType<typeof createTestVaultDb>['db'],
  input: AppendLedgerEventInput,
): Promise<LedgerEvent> {
  const result = await appendLedgerEvent(db, input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`expected ok: ${result.error.message}`);
  return result.value;
}

async function expectPersistedChainValid(
  db: ReturnType<typeof createTestVaultDb>['db'],
  expectedLength: number,
): Promise<LedgerEvent[]> {
  const page = await getEventsPaginated(db, { limit: 100 });
  expect(page.items).toHaveLength(expectedLength);
  const chainResult = await verifyChain(page.items);
  expect(chainResult.valid).toBe(true);
  return page.items;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('appendLedgerEvent', () => {
  let vault: ReturnType<typeof createTestVaultDb>;

  beforeEach(() => {
    vault = createTestVaultDb();
  });

  // ------------------------------------------------------------------
  // 1. First event (empty ledger)
  // ------------------------------------------------------------------

  it('appends the first event to an empty ledger', async () => {
    const { db } = vault;
    const payload = makeDonationPayload();

    const result = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload,
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    expect(result.value.sequence_no).toBe(1);
    expect(result.value.prev_hash).toBe(ZERO_HASH);
    expect(result.value.event_hash).toHaveLength(64);
    expect(result.value.event_hash).toMatch(/^[0-9a-f]{64}$/);

    // Verify event_hash matches computeEventHash for the same base
    const base: LedgerEventBase = {
      sequence_no: result.value.sequence_no,
      event_type: result.value.event_type,
      payload: result.value.payload,
      prev_hash: result.value.prev_hash,
      created_at_utc: result.value.created_at_utc,
    };
    const computed = await computeEventHash(base);
    expect(result.value.event_hash).toBe(computed);
  });

  // ------------------------------------------------------------------
  // 2. Chain building (multiple events)
  // ------------------------------------------------------------------

  it('builds a valid hash chain across multiple events', async () => {
    const { db } = vault;

    const p1 = makeDonationPayload({
      tx_signature: 'sig1111111111111111111111111111111111111111111111111111',
      amount_usdc_minor: '1000000',
    });
    const p2 = makeDonationPayload({
      tx_signature: 'sig2222222222222222222222222222222222222222222222222222',
      amount_usdc_minor: '2000000',
    });
    const p3 = makeDonationPayload({
      tx_signature: 'sig3333333333333333333333333333333333333333333333333333',
      amount_usdc_minor: '3000000',
    });

    const r1 = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: p1,
      created_at_utc: '2025-01-15T10:30:01Z',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) throw new Error('expected ok');
    expect(r1.value.sequence_no).toBe(1);

    const r2 = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: p2,
      created_at_utc: '2025-01-15T10:30:02Z',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error('expected ok');
    expect(r2.value.sequence_no).toBe(2);
    expect(r2.value.prev_hash).toBe(r1.value.event_hash);

    const r3 = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: p3,
      created_at_utc: '2025-01-15T10:30:03Z',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) throw new Error('expected ok');
    expect(r3.value.sequence_no).toBe(3);
    expect(r3.value.prev_hash).toBe(r2.value.event_hash);

    // Read all events back and verify the chain
    const page = await getEventsPaginated(db, { limit: 100 });
    expect(page.items).toHaveLength(3);
    const chainResult = await verifyChain(page.items);
    expect(chainResult.valid).toBe(true);
  });

  // Scenario: Append a disbursement_recorded event and verify persisted chain integrity.
  it('appends a disbursement_recorded event and preserves chain integrity', async () => {
    const { db } = vault;

    const event = await appendOk(db, {
      event_type: 'disbursement_recorded',
      payload: makeDisbursementPayload(),
      created_at_utc: '2025-01-15T10:36:00Z',
    });

    expect(event.sequence_no).toBe(1);
    expect(event.event_type).toBe('disbursement_recorded');
    expect(event.prev_hash).toBe(ZERO_HASH);

    await expectPersistedChainValid(db, 1);
  });

  // Scenario: Append an anchor_published event after an anchored head and verify chain integrity.
  it('appends an anchor_published event and preserves chain integrity', async () => {
    const { db } = vault;

    const donation = await appendOk(db, {
      event_type: 'donation_confirmed',
      payload: makeDonationPayload(),
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    const anchor = await appendOk(db, {
      event_type: 'anchor_published',
      payload: makeAnchorPayload({
        anchored_head_sequence_no: donation.sequence_no,
        anchored_head_hash: donation.event_hash,
      }),
      created_at_utc: '2025-01-16T01:00:00Z',
    });

    expect(anchor.sequence_no).toBe(2);
    expect(anchor.event_type).toBe('anchor_published');
    expect(anchor.prev_hash).toBe(donation.event_hash);

    await expectPersistedChainValid(db, 2);
  });

  // Scenario: Append a correction_recorded event for an existing target and verify chain integrity.
  it('appends a correction_recorded event and preserves chain integrity', async () => {
    const { db } = vault;

    const disbursement = await appendOk(db, {
      event_type: 'disbursement_recorded',
      payload: makeDisbursementPayload(),
      created_at_utc: '2025-01-15T10:36:00Z',
    });

    const correction = await appendOk(db, {
      event_type: 'correction_recorded',
      payload: makeCorrectionPayload({ corrects_sequence_no: disbursement.sequence_no }),
      created_at_utc: '2025-01-16T10:00:00Z',
    });

    expect(correction.sequence_no).toBe(2);
    expect(correction.event_type).toBe('correction_recorded');
    expect(correction.prev_hash).toBe(disbursement.event_hash);

    await expectPersistedChainValid(db, 2);
  });

  // Scenario: Append all supported event types in one ledger and verify the full chain.
  it('builds a valid hash chain across all event types', async () => {
    const { db } = vault;

    const donation = await appendOk(db, {
      event_type: 'donation_confirmed',
      payload: makeDonationPayload(),
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    const disbursement = await appendOk(db, {
      event_type: 'disbursement_recorded',
      payload: makeDisbursementPayload(),
      created_at_utc: '2025-01-15T10:36:00Z',
    });

    const anchor = await appendOk(db, {
      event_type: 'anchor_published',
      payload: makeAnchorPayload({
        anchored_head_sequence_no: disbursement.sequence_no,
        anchored_head_hash: disbursement.event_hash,
      }),
      created_at_utc: '2025-01-16T01:00:00Z',
    });

    const correction = await appendOk(db, {
      event_type: 'correction_recorded',
      payload: makeCorrectionPayload({ corrects_sequence_no: disbursement.sequence_no }),
      created_at_utc: '2025-01-16T10:00:00Z',
    });

    expect([donation, disbursement, anchor, correction].map((event) => event.sequence_no)).toEqual([
      1, 2, 3, 4,
    ]);

    const events = await expectPersistedChainValid(db, 4);
    expect(events.map((event) => event.event_type)).toEqual([
      'donation_confirmed',
      'disbursement_recorded',
      'anchor_published',
      'correction_recorded',
    ]);
  });

  // ------------------------------------------------------------------
  // 3. Hash is deterministic for same preimage
  // ------------------------------------------------------------------

  it('produces a deterministic hash for the same preimage', async () => {
    const { db } = vault;
    const payload = makeDonationPayload();

    const result = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload,
      created_at_utc: '2025-01-15T10:30:00Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    // Compute hash manually for the same base
    const base: LedgerEventBase = {
      sequence_no: 1,
      event_type: 'donation_confirmed',
      payload,
      prev_hash: ZERO_HASH,
      created_at_utc: '2025-01-15T10:30:00Z',
    };
    const manualHash = await computeEventHash(base);

    expect(result.value.event_hash).toBe(manualHash);
  });

  // ------------------------------------------------------------------
  // 4. Different sequence_no produces different hash
  // ------------------------------------------------------------------

  it('produces different hashes when sequence_no differs', async () => {
    const { db } = vault;
    const payload = makeDonationPayload();

    const r1 = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload,
      created_at_utc: '2025-01-15T10:30:00Z',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) throw new Error('expected ok');

    // Second event with same payload — sequence_no will be 2, prev_hash
    // will be r1.event_hash, so the preimage differs.
    const r2 = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload,
      created_at_utc: '2025-01-15T10:30:00Z',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error('expected ok');

    expect(r2.value.sequence_no).toBe(2);
    expect(r1.value.event_hash).not.toBe(r2.value.event_hash);
  });

  // ------------------------------------------------------------------
  // 5. Invalid event_type
  // ------------------------------------------------------------------

  it('rejects an unknown event_type', async () => {
    const { db } = vault;

    const result = await appendLedgerEvent(db, {
      // @ts-expect-error — intentionally passing an invalid event_type for testing
      event_type: 'invalid',
      payload: makeDonationPayload(),
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('INVALID_INPUT');
    expect(result.error.message).toBe('Unknown event_type: invalid');
  });

  // ------------------------------------------------------------------
  // 6. Invalid payload (fails Zod schema)
  // ------------------------------------------------------------------

  it('rejects a payload that fails Zod validation', async () => {
    const { db } = vault;

    const result = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: makeDonationPayload({ amount_usdc_minor: '0' }),
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('INVALID_INPUT');
    if (result.error.code !== 'INVALID_INPUT') throw new Error('expected invalid input');
    expect(result.error.message).toBe('Payload validation failed');
    expect(result.error.zodError).toBeDefined();
  });

  // ------------------------------------------------------------------
  // 7. Invalid timestamp
  // ------------------------------------------------------------------

  it('rejects an invalid created_at_utc timestamp', async () => {
    const { db } = vault;

    const result = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: makeDonationPayload(),
      created_at_utc: 'not-a-timestamp',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('INVALID_INPUT');
    expect(result.error.message).toBe('Invalid created_at_utc timestamp');
  });

  // ------------------------------------------------------------------
  // 8. Payload too large
  // ------------------------------------------------------------------

  it('uses Zod-validated payload for serialization and hash, not raw input', async () => {
    const { db } = vault;

    // Append a valid donation payload.  The returned event's payload must
    // match the validated (Zod-processed) payload, proving that
    // validatedPayload is used for serialization, hashing, and the returned
    // LedgerEvent — not the raw input.
    const inputPayload = makeDonationPayload({ amount_usdc_minor: '500000' });

    const result = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: inputPayload,
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`expected success, got: ${result.error.message}`);

    // The returned payload should be deeply equal to the input (both are
    // DonationPayload, and Zod strict mode preserves all declared fields).
    expect(result.value.payload).toEqual(inputPayload);

    // Verify the event is in the DB with the same payload
    const events = await getEventsPaginated(db, { limit: 1 });
    expect(events.items[0]!.payload).toEqual(inputPayload);
  });

  // ------------------------------------------------------------------
  // 9. Hash collision retry
  // ------------------------------------------------------------------

  it('retries with a bumped timestamp on hash collision', async () => {
    const { db, sqliteDb } = vault;

    // Step 1 — append event A
    const payloadA = makeDonationPayload({
      tx_signature: 'sigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
    const rA = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: payloadA,
      created_at_utc: '2025-01-15T10:30:00Z',
    });
    expect(rA.ok).toBe(true);
    if (!rA.ok) throw new Error('expected ok');

    // Step 2 — compute what event B's hash *would* be if appended next
    const payloadB = makeDonationPayload({
      tx_signature: 'sigBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    });
    const timestampB = '2025-01-15T10:30:02Z';

    const baseB: LedgerEventBase = {
      sequence_no: 2,
      event_type: 'donation_confirmed',
      payload: payloadB,
      prev_hash: rA.value.event_hash,
      created_at_utc: timestampB,
    };
    const hashB = await computeEventHash(baseB);

    // Step 3 — manually insert a row that occupies hashB so the real
    // insert hits a UNIQUE constraint.  Use sequence_no = 0 so the
    // head query still returns event A (sequence_no = 1).
    sqliteDb
      .prepare(
        `INSERT INTO ledger_events
           (sequence_no, event_type, payload_json, prev_hash, event_hash, created_at_utc)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(0, 'donation_confirmed', '{}', ZERO_HASH, hashB, '2025-01-15T10:30:00Z');

    // Step 4 — try to append event B; it should collide, retry, and
    // succeed with a bumped created_at_utc.
    const rB = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload: payloadB,
      created_at_utc: timestampB,
    });

    expect(rB.ok).toBe(true);
    if (!rB.ok) throw new Error('expected ok');

    // The returned created_at_utc must differ from the input because
    // the retry loop bumped it.
    expect(rB.value.created_at_utc).not.toBe(timestampB);
    // It should be exactly 1 second later (first retry, attempt 0 → +1s)
    expect(rB.value.created_at_utc).toBe('2025-01-15T10:30:03Z');
    // The event_hash must differ from hashB (preimage changed)
    expect(rB.value.event_hash).not.toBe(hashB);
    // Sequence number should still be 2 (head was event A)
    expect(rB.value.sequence_no).toBe(2);
  });

  // ------------------------------------------------------------------
  // 10. Returned event is complete
  // ------------------------------------------------------------------

  it('returns a complete LedgerEvent with all fields', async () => {
    const { db } = vault;
    const payload = makeDonationPayload();

    const result = await appendLedgerEvent(db, {
      event_type: 'donation_confirmed',
      payload,
      created_at_utc: '2025-01-15T10:30:00Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    const event = result.value;

    // All fields present
    expect(event.sequence_no).toBe(1);
    expect(event.event_type).toBe('donation_confirmed');
    expect(event.prev_hash).toBe(ZERO_HASH);
    expect(event.event_hash).toHaveLength(64);
    expect(event.created_at_utc).toBe('2025-01-15T10:30:00Z');

    // Payload is the original typed object, not a JSON string
    expect(typeof event.payload).toBe('object');
    if (!isDonationPayload(event.payload)) throw new Error('expected donation payload');
    expect(event.payload.cluster).toBe('devnet');
    expect(event.payload.amount_usdc_minor).toBe('1000000');
    expect(event.payload.tx_signature).toBe(payload.tx_signature);
    expect(event.payload.slot).toBe(100);
  });
});
