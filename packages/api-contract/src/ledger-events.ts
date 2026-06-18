/** Single raw ledger event in GET /api/ledger-events */
export interface LedgerEventItem {
  sequence_no: number;
  event_type: string;
  payload_json: string;
  prev_hash: string;
  event_hash: string;
  created_at_utc: string;
}

export interface LedgerEventsResponse {
  items: LedgerEventItem[];
  next_after_sequence_no: number | null;
}
