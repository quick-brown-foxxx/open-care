import { drizzle as drizzleBsql } from 'drizzle-orm/better-sqlite3';
import type { Database } from 'better-sqlite3';
import * as schema from './schema/vault-db.js';

/** Drizzle instance backed by better-sqlite3 (for testing only — NOT for Workers). */
export type VaultDbTest = ReturnType<typeof drizzleBsql<typeof schema>>;

/** Create a Drizzle instance from a better-sqlite3 database (for testing only — NOT for Workers). */
export function createVaultDbTest(sqliteDb: Database): VaultDbTest {
  return drizzleBsql(sqliteDb, { schema });
}
