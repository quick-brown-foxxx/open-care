import { describe, expectTypeOf, it } from 'vitest';
import type {
  AnchorManualResponse as ContractAnchorManualResponse,
  DisbursementWriteResponse as ContractDisbursementWriteResponse,
  DisbursementsResponse as ContractDisbursementsResponse,
  DonationsResponse as ContractDonationsResponse,
  HealthResponse as ContractHealthResponse,
  LedgerEventsResponse as ContractLedgerEventsResponse,
  PendingRequestItem as ContractPendingRequestItem,
  PendingRequestsResponse as ContractPendingRequestsResponse,
  SendCodeResponse as ContractSendCodeResponse,
  TotalsResponse as ContractTotalsResponse,
  VerifyResponse as ContractVerifyResponse,
} from '@open-care/api-contract';
import type { DisbursementsResponse as ValibotDisbursementsResponse } from './disbursements.js';
import type { DonationsResponse as ValibotDonationsResponse } from './donations.js';
import type { HealthResponse as ValibotHealthResponse } from './health.js';
import type { LedgerEventsResponse as ValibotLedgerEventsResponse } from './ledger-events.js';
import type {
  AnchorManualResponse as ValibotAnchorManualResponse,
  DisbursementWriteResponse as ValibotDisbursementWriteResponse,
  PendingRequest as ValibotPendingRequest,
  PendingRequestsResponse as ValibotPendingRequestsResponse,
  SendCodeResponse as ValibotSendCodeResponse,
} from './operator.js';
import type { TotalsResponse as ValibotTotalsResponse } from './totals.js';
import type { VerifyResponse as ValibotVerifyResponse } from './verify.js';

// ---------------------------------------------------------------------------
// Frontend Valibot schema compliance with shared API contracts
// ---------------------------------------------------------------------------

describe('Frontend Valibot-inferred response types match API contracts', () => {
  /*
  Scenario: Public response schemas remain assignable to shared contracts
    Given frontend Valibot schemas infer response types for public API endpoints
    When the TypeScript checker evaluates schema-to-contract assignability
    Then every frontend public response type is accepted by its contract type
  */
  it('covers public read responses used by the frontend', () => {
    expectTypeOf<ValibotTotalsResponse>().toMatchTypeOf<ContractTotalsResponse>();
    expectTypeOf<ContractTotalsResponse>().toMatchTypeOf<ValibotTotalsResponse>();

    expectTypeOf<ValibotDonationsResponse>().toMatchTypeOf<ContractDonationsResponse>();
    expectTypeOf<ContractDonationsResponse>().toMatchTypeOf<ValibotDonationsResponse>();

    expectTypeOf<ValibotDisbursementsResponse>().toMatchTypeOf<ContractDisbursementsResponse>();

    expectTypeOf<ValibotLedgerEventsResponse>().toMatchTypeOf<ContractLedgerEventsResponse>();

    expectTypeOf<ValibotVerifyResponse>().toMatchTypeOf<ContractVerifyResponse>();
    expectTypeOf<ContractVerifyResponse>().toMatchTypeOf<ValibotVerifyResponse>();

    expectTypeOf<ValibotHealthResponse>().toMatchTypeOf<ContractHealthResponse>();
    expectTypeOf<ContractHealthResponse>().toMatchTypeOf<ValibotHealthResponse>();
  });

  /*
  Scenario: Operator response schemas remain assignable to shared contracts
    Given frontend Valibot schemas infer response types for operator endpoints
    When the TypeScript checker evaluates schema-to-contract assignability
    Then every frontend operator response type is accepted by its contract type
  */
  it('covers operator write and bot responses used by the frontend', () => {
    expectTypeOf<ValibotDisbursementWriteResponse>().toMatchTypeOf<ContractDisbursementWriteResponse>();
    expectTypeOf<ContractDisbursementWriteResponse>().toMatchTypeOf<ValibotDisbursementWriteResponse>();

    expectTypeOf<ValibotAnchorManualResponse>().toMatchTypeOf<ContractAnchorManualResponse>();
    expectTypeOf<ContractAnchorManualResponse>().toMatchTypeOf<ValibotAnchorManualResponse>();

    expectTypeOf<ValibotPendingRequest>().toMatchTypeOf<ContractPendingRequestItem>();
    expectTypeOf<ContractPendingRequestItem>().toMatchTypeOf<ValibotPendingRequest>();

    expectTypeOf<ValibotPendingRequestsResponse>().toMatchTypeOf<ContractPendingRequestsResponse>();
    expectTypeOf<ContractPendingRequestsResponse>().toMatchTypeOf<ValibotPendingRequestsResponse>();

    expectTypeOf<ValibotSendCodeResponse>().toMatchTypeOf<ContractSendCodeResponse>();
    expectTypeOf<ContractSendCodeResponse>().toMatchTypeOf<ValibotSendCodeResponse>();
  });
});
