/** Single donation item in GET /api/donations */
export interface DonationItem {
  sequence_no: number;
  event_hash: string;
  created_at_utc: string;
  tx_signature: string;
  usdc_mint: string;
  vault_usdc_ata: string;
  amount_usdc_minor: string;
  slot: number;
  block_time_utc: string;
  cluster: string;
}

export interface DonationsResponse {
  items: DonationItem[];
  next_cursor: number | null;
}
