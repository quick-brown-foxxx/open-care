import { describe, it, expect } from 'vitest';
import { constantTimeEqual } from '../src/lib/constant-time.js';

describe('constantTimeEqual', () => {
  // ---------------------------------------------------------------------------
  // Basic equality
  // ---------------------------------------------------------------------------

  it('returns true for identical strings', () => {
    expect(constantTimeEqual('hello', 'hello')).toBe(true);
  });

  it('returns true for identical empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true);
  });

  it('returns true for identical long strings', () => {
    const long = 'a'.repeat(10_000);
    expect(constantTimeEqual(long, long)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Different strings
  // ---------------------------------------------------------------------------

  it('returns false for different strings of same length', () => {
    expect(constantTimeEqual('hello', 'world')).toBe(false);
  });

  it('returns false for strings differing by one character', () => {
    expect(constantTimeEqual('hello', 'hallo')).toBe(false);
  });

  it('returns false for strings of different lengths', () => {
    expect(constantTimeEqual('short', 'longer')).toBe(false);
  });

  it('returns false when one string is empty and the other is not', () => {
    expect(constantTimeEqual('', 'a')).toBe(false);
    expect(constantTimeEqual('a', '')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Unicode
  // ---------------------------------------------------------------------------

  it('returns true for identical unicode strings', () => {
    expect(constantTimeEqual('café', 'café')).toBe(true);
  });

  it('returns false for different unicode strings', () => {
    expect(constantTimeEqual('café', 'cafe')).toBe(false);
  });

  it('handles emoji strings', () => {
    expect(constantTimeEqual('🎉🎉', '🎉🎉')).toBe(true);
    expect(constantTimeEqual('🎉🎉', '🎉🎊')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Cross-site behavioral consistency
  // ---------------------------------------------------------------------------

  it('produces same result for all three call-site patterns', () => {
    // ingest: Bearer token comparison (token vs env secret)
    const token = 'sk_live_abc123';
    const secret = 'sk_live_abc123';
    expect(constantTimeEqual(token, secret)).toBe(true);
    expect(constantTimeEqual(token, 'wrong_secret')).toBe(false);

    // operator: Bearer token comparison (token vs env secret)
    const opToken = 'op_secret_xyz';
    const opSecret = 'op_secret_xyz';
    expect(constantTimeEqual(opToken, opSecret)).toBe(true);
    expect(constantTimeEqual(opToken, 'wrong_op_secret')).toBe(false);

    // tg-bot: webhook header vs secret
    const headerValue = 'tg_webhook_secret_42';
    const tgSecret = 'tg_webhook_secret_42';
    expect(constantTimeEqual(headerValue, tgSecret)).toBe(true);
    expect(constantTimeEqual(headerValue, 'wrong_tg_secret')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles strings with null bytes', () => {
    expect(constantTimeEqual('a\0b', 'a\0b')).toBe(true);
    expect(constantTimeEqual('a\0b', 'a\0c')).toBe(false);
  });

  it('handles strings with special characters', () => {
    expect(constantTimeEqual('!@#$%^&*()', '!@#$%^&*()')).toBe(true);
    expect(constantTimeEqual('!@#$%^&*()', '!@#$%^&*(X')).toBe(false);
  });

  it('handles very long strings (100k chars)', () => {
    const a = 'x'.repeat(100_000);
    const b = 'x'.repeat(100_000);
    const c = 'x'.repeat(99_999) + 'y';
    expect(constantTimeEqual(a, b)).toBe(true);
    expect(constantTimeEqual(a, c)).toBe(false);
  });
});
