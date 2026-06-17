import { Hono } from 'hono';
import { createVaultDb, getEventsPaginated } from '@open-care/vault-db';
import type { LedgerEvent } from '@open-care/vault-core';
import type { Env } from '../lib/env.js';
import { withCache } from '../lib/cache.js';
import { internalErrorResponse } from '../lib/errors.js';
import { validateLimit, validateCursor } from '../lib/pagination.js';

const app = new Hono<{ Bindings: Env }>();

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

/** Shape of a single item in the ledger-events API response. */
interface LedgerEventItem {
  sequence_no: number;
  event_type: string;
  payload_json: string;
  prev_hash: string;
  event_hash: string;
  created_at_utc: string;
}

/**
 * Transform a {@link LedgerEvent} into the API response shape:
 * serialize `payload` back to a JSON string as `payload_json`.
 */
function toApiItem(event: LedgerEvent): LedgerEventItem {
  return {
    sequence_no: event.sequence_no,
    event_type: event.event_type,
    payload_json: JSON.stringify(event.payload),
    prev_hash: event.prev_hash,
    event_hash: event.event_hash,
    created_at_utc: event.created_at_utc,
  };
}

app.get('/api/ledger-events', async (c) => {
  const limit = validateLimit(c.req.query('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  if (limit instanceof Response) return limit;

  const cursor = validateCursor(c.req.query('after_sequence_no'));
  if (cursor instanceof Response) return cursor;

  const db = createVaultDb(c.env.vault_db);

  let result;
  try {
    const options: { limit: number; cursor?: number } = { limit };
    if (cursor !== undefined) options.cursor = cursor;
    result = await getEventsPaginated(db, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return internalErrorResponse(`Failed to fetch ledger events: ${message}`);
  }

  const transformedItems = result.items.map(toApiItem);

  withCache(c);
  return c.json(
    {
      items: transformedItems,
      next_after_sequence_no: result.nextCursor,
    },
    200,
  );
});

export default app;
