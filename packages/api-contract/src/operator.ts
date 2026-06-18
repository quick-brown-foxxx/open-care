// --- Disbursement write (POST /api/disbursements) ---

export interface DisbursementWriteResponse {
  sequence_no: number;
  event_hash: string;
  head_hash: string;
  public_beneficiary_ref: string | null;
  next_action: string;
}

// --- Correction write (POST /api/corrections) ---

export interface CorrectionWriteResponse {
  sequence_no: number;
  event_hash: string;
  head_hash: string;
  corrects_sequence_no: number;
}

// --- Anchor manual (POST /api/anchor/manual) ---

export interface AnchorManualPublished {
  status: 'published';
  anchored_head_hash: string;
  memo_text: string;
  tx_signature: string;
  duration_ms: number;
  anchor_runs_id: number;
}

export interface AnchorManualAlreadyPublished {
  status: 'already_published';
  anchored_head_hash: string;
  anchored_head_sequence_no: number;
  duration_ms: number;
}

export interface AnchorManualEmptyLedger {
  status: 'empty_ledger';
  duration_ms: number;
}

export type AnchorManualResponse =
  | AnchorManualPublished
  | AnchorManualAlreadyPublished
  | AnchorManualEmptyLedger;

// --- Pending requests (GET /tg/internal/pending-requests) ---

export interface PendingRequestItem {
  opaque_id: string;
  conversation_id: number;
  internal_handle: string;
  request_status: string;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface PendingRequestsResponse {
  items: PendingRequestItem[];
  next_cursor: string | null;
}

// --- Send code (POST /tg/internal/send-code) ---

export interface SendCodeResponse {
  delivered_at_utc: string;
}
