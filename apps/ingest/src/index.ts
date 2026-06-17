import { Hono } from 'hono';
import type { HonoEnv } from './lib/env.js';
import { createVaultDb } from '@open-care/vault-db';
import { reconcileMissedSignatures } from './lib/reconciliation.js';
import { processInbox } from './lib/inbox.js';
import webhookRoute from './routes/webhook.js';
import healthRoute from './routes/health.js';
import reconcileRoute from './routes/reconcile.js';

const app = new Hono<HonoEnv>();

// Mount sub-apps at their paths
app.route('/webhook/helius', webhookRoute);
app.route('/health', healthRoute);
app.route('/internal/reconcile', reconcileRoute);

/**
 * Scheduled handler: runs reconciliation every 6 hours.
 * Scans the vault USDC ATA for missed signatures and processes
 * any new inbox rows.
 */
async function scheduled(
  _event: ScheduledEvent,
  env: HonoEnv['Bindings'],
  ctx: ExecutionContext,
): Promise<void> {
  const db = createVaultDb(env.vault_db);

  const result = await reconcileMissedSignatures(db, env);

  if (result.ok) {
    console.log(
      `[scheduled-reconcile] inserted=${result.value.inserted} skipped=${result.value.skipped}`,
    );
  } else {
    console.error(`[scheduled-reconcile] error: ${result.error.message}`);
  }

  // Process any new inbox rows (including those just inserted by reconciliation)
  ctx.waitUntil(processInbox(db, env));
}

export default { fetch: app.fetch, scheduled };
