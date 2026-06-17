import type { AnchorPayload, LedgerEventBase } from "../events.js";

export const sampleAnchorPayload: AnchorPayload = {
  anchor_date: "2026-06-15",
  anchored_head_sequence_no: 5,
  anchored_head_hash: "PLACEHOLDER_ANCHORED_HEAD_HASH",
  tx_signature: "7nOpQ3456seedAnchorDevnetExampleTx",
  anchor_wallet_address: "BhKtkM1oHADwo8ap5P6Lymj7b3iaspiAm37RA9KMn8YG",
  memo_text: "open-care.org anchor 2026-06-15 seq=5",
  published_at_utc: "2026-06-16T01:00:00Z",
  cluster: "devnet",
};

export const sampleAnchorEvent: LedgerEventBase = {
  sequence_no: 6,
  event_type: "anchor_published",
  payload: sampleAnchorPayload,
  prev_hash: "PLACEHOLDER_PREV_HASH_ANCHOR",
  created_at_utc: "2026-06-16T01:00:00Z",
};
