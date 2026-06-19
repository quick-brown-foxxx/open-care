import { eq, sql } from 'drizzle-orm';
import { anchorRuns } from '@open-care/vault-db/schema/vault-db';
import { appendLedgerEvent } from '@open-care/vault-db';
import type { VaultDb } from '@open-care/vault-db';
import { parseAnchorMemo, utcNow } from '@open-care/vault-core';
import type { Cluster } from '@open-care/vault-core';
import { getTransaction, getSignatureStatus, getBalance } from './solana';
import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { lockExpiresAt } from './lock';

async function anchorPublishedEventExists(
  db: VaultDb,
  txSignature: string,
  anchoredHeadHash: string,
): Promise<boolean> {
  const rows = await db.all(
    sql`SELECT 1 FROM ledger_events
        WHERE event_type = 'anchor_published'
          AND json_extract(payload_json, '$.tx_signature') = ${txSignature}
          AND json_extract(payload_json, '$.anchored_head_hash') = ${anchoredHeadHash}
        LIMIT 1`,
  );
  return rows.length > 0;
}

function hasFinalizedConfirmationStatus(tx: unknown): boolean {
  const maybeStatus = (tx as { confirmationStatus?: unknown }).confirmationStatus;
  return maybeStatus === undefined || maybeStatus === 'finalized';
}

function hasFinalizedSignatureStatus(status: unknown): boolean {
  const maybeStatus = (status as { confirmationStatus?: unknown }).confirmationStatus;
  if (maybeStatus === 'finalized') {
    return true;
  }

  // Older Solana RPC nodes may omit confirmationStatus; a null confirmations
  // count is the legacy finalized signal.
  if (maybeStatus === undefined || maybeStatus === null) {
    return (status as { confirmations?: unknown }).confirmations === null;
  }

  return false;
}

async function refreshStaleLockForRetry(
  db: VaultDb,
  staleRow: typeof anchorRuns.$inferSelect,
): Promise<void> {
  await db
    .update(anchorRuns)
    .set({
      locked_until_utc: lockExpiresAt(),
      attempt_count: sql`${anchorRuns.attempt_count} + 1`,
      updated_at_utc: utcNow(),
    })
    .where(eq(anchorRuns.id, staleRow.id));
}

export async function recoverStaleLock(
  db: VaultDb,
  connection: Connection,
  staleRow: typeof anchorRuns.$inferSelect,
  cluster: Cluster,
): Promise<void> {
  // If tx_signature exists, try to look it up
  if (staleRow.tx_signature) {
    const statusResult = await getSignatureStatus(connection, staleRow.tx_signature);
    if (statusResult.ok && statusResult.value !== null) {
      if (!hasFinalizedSignatureStatus(statusResult.value)) {
        await refreshStaleLockForRetry(db, staleRow);
        return;
      }
    }

    const txResult = await getTransaction(connection, staleRow.tx_signature);
    if (txResult.ok && txResult.value !== null) {
      if (!hasFinalizedConfirmationStatus(txResult.value)) {
        await refreshStaleLockForRetry(db, staleRow);
        return;
      }

      // Transaction found and finalized — backfill.
      // Fetch anchor wallet balance for health monitoring.
      const balanceResult = await getBalance(
        connection,
        new PublicKey(staleRow.anchor_wallet_address),
      );
      const solBalance = balanceResult.ok ? balanceResult.value : 0;

      const headHash = parseAnchorMemo(staleRow.memo_text);
      if (!headHash) {
        throw new Error('Failed to backfill anchor_published event: invalid anchor memo');
      }
      if (headHash !== staleRow.anchored_head_hash) {
        throw new Error('Failed to backfill anchor_published event: memo hash mismatch');
      }

      const alreadyBackfilled = await anchorPublishedEventExists(
        db,
        staleRow.tx_signature,
        staleRow.anchored_head_hash,
      );

      if (!alreadyBackfilled) {
        // Recovered event timestamps must come from the finalized on-chain
        // transaction block time when creating a new backfill.
        const blockTime = txResult.value.blockTime;
        if (blockTime === null || blockTime === undefined) {
          throw new Error(
            'Failed to backfill anchor_published event: missing transaction blockTime',
          );
        }

        const publishedAtUtc = new Date(blockTime * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

        const appendResult = await appendLedgerEvent(db, {
          event_type: 'anchor_published',
          payload: {
            anchor_date: staleRow.anchor_date,
            anchored_head_sequence_no: staleRow.anchored_head_sequence_no,
            anchored_head_hash: staleRow.anchored_head_hash,
            tx_signature: staleRow.tx_signature,
            anchor_wallet_address: staleRow.anchor_wallet_address,
            memo_text: staleRow.memo_text,
            published_at_utc: publishedAtUtc,
            cluster,
          },
          created_at_utc: publishedAtUtc,
        });
        if (!appendResult.ok) {
          throw new Error(
            `Failed to backfill anchor_published event: ${appendResult.error.message}`,
          );
        }
      }

      await db
        .update(anchorRuns)
        .set({
          status: 'published',
          tx_signature: staleRow.tx_signature,
          locked_until_utc: null,
          last_anchor_wallet_sol_lamports: solBalance,
          updated_at_utc: utcNow(),
        })
        .where(eq(anchorRuns.id, staleRow.id));
      return;
    }
  }

  // Transaction not found or no tx_signature — mark as failed
  await db
    .update(anchorRuns)
    .set({
      status: 'failed',
      last_error: 'lock_expired_no_tx_found',
      locked_until_utc: null,
      updated_at_utc: utcNow(),
    })
    .where(eq(anchorRuns.id, staleRow.id));
}
