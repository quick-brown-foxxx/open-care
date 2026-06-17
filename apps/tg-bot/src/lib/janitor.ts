import { and, lt, isNotNull } from 'drizzle-orm';
import { botSchema } from '@open-care/vault-db';
import type { BotDb } from '@open-care/vault-db';

const { conversations } = botSchema;

/**
 * Clean up expired encrypted code TTL blobs from the conversations table.
 *
 * Finds rows where `encrypted_code_expires_at_utc < now()` AND
 * `encrypted_code_ttl_blob IS NOT NULL`, and sets both the blob and
 * the expiry timestamp to NULL.
 *
 * This is called at the start of send-code processing so that expired
 * blobs don't accumulate indefinitely.
 *
 * @returns The number of rows cleaned up.
 */
export async function janitorExpiredCodeBlobs(db: BotDb): Promise<number> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const result = await db
    .update(conversations)
    .set({
      encrypted_code_ttl_blob: null,
      encrypted_code_expires_at_utc: null,
    })
    .where(
      and(
        lt(conversations.encrypted_code_expires_at_utc, now),
        isNotNull(conversations.encrypted_code_ttl_blob),
      ),
    );

  return result.meta.rows_written ?? 0;
}
