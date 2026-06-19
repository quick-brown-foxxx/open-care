import * as v from 'valibot';
import type {
  AnchorManualResponse as ContractAnchorManualResponse,
  DisbursementWriteResponse as ContractDisbursementWriteResponse,
  PendingRequestItem as ContractPendingRequestItem,
  PendingRequestsResponse as ContractPendingRequestsResponse,
  SendCodeResponse as ContractSendCodeResponse,
} from '@open-care/api-contract';
import type { AssertAssignable } from './contract-checks.js';

// ---------------------------------------------------------------------------
// Reusable validators (same patterns as other schema files)
// ---------------------------------------------------------------------------

/** ISO-8601 UTC timestamp with second precision and Z suffix. */
const timestamp = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/));

/** 64-character lowercase hex string. */
const hex64 = v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/));

/** Base58-encoded Solana address or signature. */
const base58 = v.pipe(v.string(), v.regex(/^[1-9A-HJ-NP-Za-km-z]+$/));

/** Public beneficiary reference: `benpub_` prefix + 16 uppercase base32 chars. */
const publicBeneficiaryRef = v.pipe(v.string(), v.regex(/^benpub_[A-Z0-9]{16}$/));

/** Anchor memo text: `ccv-anchor:` prefix + 64 hex chars. */
const memoText = v.pipe(v.string(), v.regex(/^ccv-anchor:[0-9a-f]{64}$/));

// ---------------------------------------------------------------------------
// DisbursementResponse
// ---------------------------------------------------------------------------

export const DisbursementResponseSchema = v.object({
  sequence_no: v.pipe(v.number(), v.integer(), v.minValue(1)),
  event_hash: hex64,
  head_hash: hex64,
  public_beneficiary_ref: v.nullable(publicBeneficiaryRef),
  next_action: v.string(),
});

export type DisbursementWriteResponse = v.InferOutput<typeof DisbursementResponseSchema>;
export type DisbursementResponse = DisbursementWriteResponse;

export type _DisbursementWriteResponseContractCheck = AssertAssignable<
  DisbursementWriteResponse,
  ContractDisbursementWriteResponse
>;
export type _DisbursementWriteResponseContractExactCheck = AssertAssignable<
  ContractDisbursementWriteResponse,
  DisbursementWriteResponse
>;

// ---------------------------------------------------------------------------
// AnchorManualResponse
// ---------------------------------------------------------------------------

const AnchorManualPublishedResponseSchema = v.object({
  status: v.picklist(['published']),
  anchored_head_hash: hex64,
  memo_text: memoText,
  tx_signature: base58,
  duration_ms: v.pipe(v.number(), v.integer(), v.minValue(0)),
  anchor_runs_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const AnchorManualAlreadyPublishedResponseSchema = v.object({
  status: v.picklist(['already_published']),
  anchored_head_hash: hex64,
  anchored_head_sequence_no: v.pipe(v.number(), v.integer(), v.minValue(0)),
  duration_ms: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

const AnchorManualEmptyLedgerResponseSchema = v.object({
  status: v.picklist(['empty_ledger']),
  duration_ms: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export const AnchorManualResponseSchema = v.union([
  AnchorManualPublishedResponseSchema,
  AnchorManualAlreadyPublishedResponseSchema,
  AnchorManualEmptyLedgerResponseSchema,
]);

export type AnchorManualResponse = v.InferOutput<typeof AnchorManualResponseSchema>;

export type _AnchorManualResponseContractCheck = AssertAssignable<
  AnchorManualResponse,
  ContractAnchorManualResponse
>;
export type _AnchorManualResponseContractExactCheck = AssertAssignable<
  ContractAnchorManualResponse,
  AnchorManualResponse
>;

// ---------------------------------------------------------------------------
// PendingRequest
// ---------------------------------------------------------------------------

export const PendingRequestSchema = v.object({
  opaque_id: v.string(),
  conversation_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
  internal_handle: v.string(),
  request_status: v.string(),
  created_at_utc: timestamp,
  updated_at_utc: timestamp,
});

export type PendingRequest = v.InferOutput<typeof PendingRequestSchema>;

export type _PendingRequestContractCheck = AssertAssignable<
  PendingRequest,
  ContractPendingRequestItem
>;
export type _PendingRequestContractExactCheck = AssertAssignable<
  ContractPendingRequestItem,
  PendingRequest
>;

// ---------------------------------------------------------------------------
// PendingRequestsResponse
// ---------------------------------------------------------------------------

export const PendingRequestsResponseSchema = v.object({
  items: v.array(PendingRequestSchema),
  next_cursor: v.nullable(v.string()),
});

export type PendingRequestsResponse = v.InferOutput<typeof PendingRequestsResponseSchema>;

export type _PendingRequestsResponseContractCheck = AssertAssignable<
  PendingRequestsResponse,
  ContractPendingRequestsResponse
>;
export type _PendingRequestsResponseContractExactCheck = AssertAssignable<
  ContractPendingRequestsResponse,
  PendingRequestsResponse
>;

// ---------------------------------------------------------------------------
// SendCodeResponse
// ---------------------------------------------------------------------------

export const SendCodeResponseSchema = v.object({
  delivered_at_utc: timestamp,
});

export type SendCodeResponse = v.InferOutput<typeof SendCodeResponseSchema>;

export type _SendCodeResponseContractCheck = AssertAssignable<
  SendCodeResponse,
  ContractSendCodeResponse
>;
export type _SendCodeResponseContractExactCheck = AssertAssignable<
  ContractSendCodeResponse,
  SendCodeResponse
>;
