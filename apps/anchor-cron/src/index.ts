import { Hono } from 'hono';
import { createVaultDb } from '@open-care/vault-db';
import { logInfo, logWarn, logError } from '@open-care/vault-core';
import type { Env } from './lib/env';
import { runAnchor } from './lib/anchor-pipeline';
import health from './routes/health';
import manual from './routes/manual';

const app = new Hono<{ Bindings: Env }>();

app.route('/', health);
app.route('/', manual);

// Scheduled handler — triggered by cron `0 1 * * *`
async function scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const db = createVaultDb(env.vault_db);
  const result = await runAnchor(db, env, 'cron');

  if (result.status === 'published') {
    logInfo('Anchor published', {
      anchored_head_sequence_no: result.anchored_head_sequence_no,
      anchored_head_hash: result.anchored_head_hash.slice(0, 8) + '...',
      tx_signature: result.tx_signature.slice(0, 8) + '...',
      duration_ms: result.duration_ms,
      trigger_source: 'cron',
    });
  } else if (result.status === 'already_published') {
    logInfo('Anchor already published', {
      anchored_head_sequence_no: result.anchored_head_sequence_no,
      trigger_source: 'cron',
    });
  } else if (result.status === 'empty_ledger') {
    logInfo('Anchor skipped: empty ledger', { trigger_source: 'cron' });
  } else if (result.status === 'conflict') {
    logWarn('Anchor run conflict', { trigger_source: 'cron' });
  } else if (result.status === 'failed') {
    logError('Anchor failed', {
      error: result.error.message,
      trigger_source: 'cron',
    });
  }

  // Ensure the async work completes
  ctx.waitUntil(Promise.resolve());
}

export default { fetch: app.fetch, scheduled };
