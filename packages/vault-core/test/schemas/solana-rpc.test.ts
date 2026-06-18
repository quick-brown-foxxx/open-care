import { describe, it, expect } from 'vitest';
import {
  SolanaGetTransactionResponseSchema,
  SolanaGetSignaturesForAddressResponseSchema,
} from '../../src/schemas/solana-rpc.js';

describe('SolanaGetTransactionResponseSchema', () => {
  const validResponse = {
    jsonrpc: '2.0' as const,
    result: {
      slot: 123456789,
      blockTime: 1718400000,
      transaction: {
        message: {
          accountKeys: [
            'Sender111111111111111111111111111111111',
            'Vault11111111111111111111111111111111111',
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          ],
          instructions: [
            {
              programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
              parsed: {
                type: 'transfer',
                info: {
                  source: 'Sender111111111111111111111111111111111',
                  destination: 'Vault11111111111111111111111111111111111',
                  authority: 'Owner1111111111111111111111111111111111',
                  amount: '1000000',
                },
              },
            },
          ],
        },
        signatures: ['5xAbC1234mockTestVectorDonationConfirmedExample'],
      },
      meta: {
        err: null,
        fee: 5000,
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: [],
      },
    },
    id: 1,
  };

  it('accepts a valid getTransaction response', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('accepts null result (transaction not found)', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      jsonrpc: '2.0',
      result: null,
      id: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing jsonrpc field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { jsonrpc, ...noJsonrpc } = validResponse;
    const result = SolanaGetTransactionResponseSchema.safeParse(noJsonrpc);
    expect(result.success).toBe(false);
  });

  it('rejects wrong jsonrpc version', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      ...validResponse,
      jsonrpc: '1.0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing result field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { result: _result, ...noResult } = validResponse;
    const result = SolanaGetTransactionResponseSchema.safeParse(noResult);
    expect(result.success).toBe(false);
  });

  it('rejects result with missing slot', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      ...validResponse,
      result: {
        ...validResponse.result,
        slot: undefined,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects result with missing transaction', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      ...validResponse,
      result: {
        slot: 123,
        blockTime: null,
        meta: null,
        // missing transaction
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts response with extra unknown fields (passthrough)', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      ...validResponse,
      extraField: 'something',
      result: {
        ...validResponse.result,
        newMetaField: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts meta as null', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      ...validResponse,
      result: {
        ...validResponse.result,
        meta: null,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts blockTime as null', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      ...validResponse,
      result: {
        ...validResponse.result,
        blockTime: null,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-null non-object result', () => {
    const result = SolanaGetTransactionResponseSchema.safeParse({
      jsonrpc: '2.0',
      result: 'not-an-object',
      id: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('SolanaGetSignaturesForAddressResponseSchema', () => {
  const validResponse = {
    jsonrpc: '2.0' as const,
    result: [
      {
        signature: '5xAbC1234mockTestVectorDonationConfirmedExample',
        slot: 123456789,
        blockTime: 1718400000,
        err: null,
        memo: null,
        confirmationStatus: 'finalized',
      },
      {
        signature: 'anotherSig2222222222222222222222222222222222222',
        slot: 123456790,
        blockTime: null,
        err: null,
        memo: 'donation memo',
        confirmationStatus: 'finalized',
      },
    ],
    id: 1,
  };

  it('accepts a valid getSignaturesForAddress response', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('accepts an empty result array', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse({
      jsonrpc: '2.0',
      result: [],
      id: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing jsonrpc', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { jsonrpc, ...noJsonrpc } = validResponse;
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse(noJsonrpc);
    expect(result.success).toBe(false);
  });

  it('rejects non-array result', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse({
      jsonrpc: '2.0',
      result: { not: 'an array' },
      id: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects result item missing signature', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse({
      ...validResponse,
      result: [
        {
          slot: 123,
          blockTime: null,
          err: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects result item with non-string signature', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse({
      ...validResponse,
      result: [
        {
          signature: 12345,
          slot: 123,
          blockTime: null,
          err: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts result item with err as string (failed tx)', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse({
      ...validResponse,
      result: [
        {
          signature: 'failedSig',
          slot: 123,
          blockTime: null,
          err: 'insufficient funds',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts response with extra unknown fields (passthrough)', () => {
    const result = SolanaGetSignaturesForAddressResponseSchema.safeParse({
      ...validResponse,
      extraField: 'something',
      result: validResponse.result.map((item) => ({
        ...item,
        newField: 'future-data',
      })),
    });
    expect(result.success).toBe(true);
  });
});
