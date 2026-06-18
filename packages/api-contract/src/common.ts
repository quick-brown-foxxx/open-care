/**
 * Full anchor info as returned by GET /api/verify.
 * The /api/totals endpoint returns a subset (TotalsAnchor).
 */
export interface AnchorInfo {
  anchor_date: string;
  anchored_head_sequence_no: number;
  anchored_head_hash: string;
  tx_signature: string;
  anchor_wallet_address: string;
  memo_text: string;
  published_at_utc: string;
  solscan_url: string;
}
