import { describe, it, expect, afterEach } from 'vitest';
import {
  createConnection,
  createKeypair,
  getSignatureStatus,
  getTransaction,
  resetSolanaMockConfig,
  sendMemoTransaction,
} from './__mocks__/lib/solana.js';

describe('anchor-cron Solana test mock validation', () => {
  afterEach(() => {
    resetSolanaMockConfig();
  });

  it('rejects an empty anchor wallet secret before returning a fake keypair', () => {
    /*
    Scenario: Mock keypair creation rejects malformed secrets
      Given a direct call to the Solana test mock createKeypair
      When the anchor wallet secret is an empty string
      Then the mock returns a validation error instead of a fake keypair
    */
    const result = createKeypair('');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('non-empty string');
    }
  });

  it('rejects malformed anchor memo text before returning a fake signature', async () => {
    /*
    Scenario: Mock memo sending rejects malformed anchor memos
      Given a fake Solana connection and keypair
      When the memo text does not match ccv-anchor:<64 lowercase hex>
      Then the mock returns a validation error instead of a fake signature
    */
    const connection = createConnection('https://api.devnet.solana.com');
    const keypairResult = createKeypair('test-secret');
    if (!keypairResult.ok) {
      throw keypairResult.error;
    }

    const result = await sendMemoTransaction(connection, keypairResult.value, 'ccv-anchor:NOT-HEX');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('ccv-anchor:<64 lowercase hex>');
    }
  });

  it('rejects malformed RPC URLs and transaction signatures', async () => {
    /*
    Scenario: Mock RPC helpers reject malformed connection and signature inputs
      Given direct calls to the Solana test mock RPC helpers
      When the RPC URL or transaction signature shape is invalid
      Then the mock fails fast with validation errors
    */
    expect(() => createConnection('not-a-url')).toThrow('absolute http(s) URL');

    const connection = createConnection('https://api.devnet.solana.com');
    const txResult = await getTransaction(connection, 'short');
    const statusResult = await getSignatureStatus(connection, 'short');

    expect(txResult.ok).toBe(false);
    if (!txResult.ok) {
      expect(txResult.error.message).toContain('transaction signature');
    }
    expect(statusResult.ok).toBe(false);
    if (!statusResult.ok) {
      expect(statusResult.error.message).toContain('transaction signature');
    }
  });
});
