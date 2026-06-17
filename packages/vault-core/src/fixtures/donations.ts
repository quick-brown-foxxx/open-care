import type { DonationPayload, LedgerEventBase } from "../events.js";
import { ZERO_HASH } from "../hash-chain.js";

// A single donation payload matching the test vector from test-vector.test.ts
export const sampleDonation1Payload: DonationPayload = {
  cluster: "devnet",
  usdc_mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  treasury_wallet_address: "8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG",
  vault_usdc_ata: "52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG",
  tx_signature: "5xAbC1234mockTestVectorDonationConfirmedExample",
  transaction_version: 0,
  instruction_index: 3,
  inner_index: null,
  slot: 123456789,
  block_time_utc: "2026-06-14T10:23:00Z",
  amount_usdc_minor: "100000000", // 100 USDC
};

// A second donation: 50 USDC
export const sampleDonation2Payload: DonationPayload = {
  cluster: "devnet",
  usdc_mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  treasury_wallet_address: "8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG",
  vault_usdc_ata: "52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG",
  tx_signature: "3mDcF5678seedDonationTwoDevnetExampleTx",
  transaction_version: 0,
  instruction_index: 1,
  inner_index: null,
  slot: 123456790,
  block_time_utc: "2026-06-14T11:00:00Z",
  amount_usdc_minor: "50000000", // 50 USDC
};

// A third donation: 25 USDC
export const sampleDonation3Payload: DonationPayload = {
  cluster: "devnet",
  usdc_mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  treasury_wallet_address: "8ufYGMkmAWeaYaM4CnANrxLxpQoaESKTGFN1BcgU71tG",
  vault_usdc_ata: "52MK6GwPWLvjfZuXm3K9fy9PozZAgUAKridA7ycSQUtG",
  tx_signature: "9kGhJ9012seedDonationThreeDevnetExampleTx",
  transaction_version: 0,
  instruction_index: 2,
  inner_index: 0,
  slot: 123456791,
  block_time_utc: "2026-06-14T12:00:00Z",
  amount_usdc_minor: "25000000", // 25 USDC
};

// Pre-hash event base for donation 1 (first event in chain, prev_hash = ZERO_HASH)
export const sampleDonation1Event: LedgerEventBase = {
  sequence_no: 1,
  event_type: "donation_confirmed",
  payload: sampleDonation1Payload,
  prev_hash: ZERO_HASH,
  created_at_utc: "2026-06-14T10:23:01Z",
};

// Array of all 3 donation payloads
export const sampleDonationPayloads: DonationPayload[] = [
  sampleDonation1Payload,
  sampleDonation2Payload,
  sampleDonation3Payload,
];
