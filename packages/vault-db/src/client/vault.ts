/// <reference types="@cloudflare/workers-types" />

import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from '../schema/vault-db.js';

/** Drizzle instance backed by a Cloudflare D1 binding. */
export type VaultDb = ReturnType<typeof drizzleD1<typeof schema>>;

/** Create a Drizzle instance from a Cloudflare D1 binding. */
export function createVaultDb(d1Binding: D1Database): VaultDb {
  return drizzleD1(d1Binding, { schema });
}
