// --- Disbursement POST body ---

export interface DisbursementRequestBody {
  amount_usdc_minor: string;
  gift_card_count: number;
  service: 'Alter' | 'Yasno' | 'Zigmund' | 'Other';
  service_note?: string | null;
  receipt_ref: string;
  public_beneficiary_ref?: null;
  purchased_at_utc: string;
}

// --- Correction POST body ---

export interface CorrectionRequestBody {
  corrects_sequence_no: number;
  reason: string;
  replacement_fields: {
    receipt_ref?: string;
    service_note?: string;
  };
}

// --- Send code POST body ---

export interface SendCodeRequestBody {
  opaque_id: string;
  code: string;
  conversation_id: number;
  public_beneficiary_ref?: string | null;
}
