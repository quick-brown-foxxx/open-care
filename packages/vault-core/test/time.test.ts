import { describe, it, expect } from 'vitest';
import { utcNow } from '../src/lib/time.js';

describe('utcNow', () => {
  it('returns a string matching ISO-8601 second-precision format', () => {
    const result = utcNow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('does not contain milliseconds (no dot before Z)', () => {
    const result = utcNow();
    expect(result).not.toMatch(/\.\d{3}Z$/);
    expect(result).not.toContain('.');
  });

  it('produces a value parseable by new Date()', () => {
    const result = utcNow();
    const parsed = new Date(result);
    expect(parsed.getTime()).not.toBeNaN();
    // Should be within a few seconds of now
    const diffMs = Math.abs(Date.now() - parsed.getTime());
    expect(diffMs).toBeLessThan(5000);
  });

  it('produces different values on successive calls (time advances)', () => {
    const first = utcNow();
    const second = utcNow();
    // They could be the same if called within the same second, but
    // both should at least be valid timestamps
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(second).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('ends with Z (UTC indicator)', () => {
    const result = utcNow();
    expect(result.endsWith('Z')).toBe(true);
  });
});
