import * as v from 'valibot';
import type { HealthResponse as HealthResponseContract, HealthChecks as HealthChecksContract } from '@open-care/api-contract';

// ---------------------------------------------------------------------------
// HealthChecks
// ---------------------------------------------------------------------------

export const HealthChecksSchema = v.object({
  db_reachable: v.boolean(),
  anchor_stale: v.boolean(),
  anchor_wallet_low_sol: v.boolean(),
  ingest_recent_or_empty: v.boolean(),
  helius_inbox_backlog_ok: v.boolean(),
});

export type HealthChecks = v.InferOutput<typeof HealthChecksSchema>;

// ---------------------------------------------------------------------------
// HealthResponse
// ---------------------------------------------------------------------------

export const HealthResponseSchema = v.object({
  status: v.picklist(['ok', 'degraded']),
  version: v.string(),
  response_time_ms: v.number(),
  checks: HealthChecksSchema,
});

export type HealthResponse = v.InferOutput<typeof HealthResponseSchema>;

// Compile-time contract verification: Valibot-inferred type must satisfy the API contract.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _HealthContractCheck = HealthResponse extends HealthResponseContract ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _HealthChecksContractCheck = HealthChecks extends HealthChecksContract ? true : never;
