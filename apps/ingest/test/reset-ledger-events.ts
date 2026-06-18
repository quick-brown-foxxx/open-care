import { sql } from 'drizzle-orm';
import type { VaultDb } from '@open-care/vault-db';

const LEDGER_EVENT_TRIGGER_NAMES = ['ledger_events_no_delete', 'ledger_events_no_update'] as const;

interface TriggerRow {
  name: string;
  sql: string | null;
}

async function readInstalledLedgerTriggerSql(db: VaultDb): Promise<string[]> {
  const triggerRows = await db.all<TriggerRow>(sql`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'trigger'
      AND name IN ('ledger_events_no_delete', 'ledger_events_no_update')
  `);
  const triggersByName = new Map(triggerRows.map((row) => [row.name, row.sql]));

  return LEDGER_EVENT_TRIGGER_NAMES.map((triggerName) => {
    const triggerSql = triggersByName.get(triggerName);
    if (!triggerSql) {
      throw new Error(`Expected migrated ledger trigger to exist: ${triggerName}`);
    }
    return triggerSql;
  });
}

/**
 * Test-only reset helper for suites that require an empty ledger.
 *
 * Production code must never bypass the append-only ledger triggers. Tests use
 * this helper only for state isolation after D1 migrations install the same
 * triggers used in deployed environments.
 */
export async function resetLedgerEventsForTest(db: VaultDb): Promise<void> {
  const triggerSqlStatements = await readInstalledLedgerTriggerSql(db);

  await db.run(sql`DROP TRIGGER IF EXISTS ledger_events_no_delete`);
  await db.run(sql`DROP TRIGGER IF EXISTS ledger_events_no_update`);

  try {
    await db.run(sql`DELETE FROM ledger_events`);
  } finally {
    for (const triggerSql of triggerSqlStatements) {
      await db.run(sql.raw(triggerSql));
    }
  }
}
