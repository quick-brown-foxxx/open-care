/** Single disbursement item in GET /api/disbursements */
export interface DisbursementItem {
  sequence_no: number;
  event_hash: string;
  created_at_utc: string;
  amount_usdc_minor: string;
  gift_card_count: number;
  service: string;
  service_note: string | null;
  receipt_ref: string;
  public_beneficiary_ref: string | null;
  purchased_at_utc: string;
  recorded_at_utc: string;
  recorded_by: string;
}

export interface DisbursementsResponse {
  items: DisbursementItem[];
  next_cursor: number | null;
}
