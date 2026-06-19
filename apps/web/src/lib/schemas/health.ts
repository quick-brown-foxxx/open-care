import * as v from 'valibot';
import type { HealthResponse as ContractHealthResponse } from '@open-care/api-contract';
import type { AssertAssignable } from './contract-checks.js';

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
  contact_url: v.nullable(v.string()),
});

export type HealthResponse = v.InferOutput<typeof HealthResponseSchema>;

export type _HealthResponseContractCheck = AssertAssignable<HealthResponse, ContractHealthResponse>;
export type _HealthResponseContractExactCheck = AssertAssignable<
  ContractHealthResponse,
  HealthResponse
>;
