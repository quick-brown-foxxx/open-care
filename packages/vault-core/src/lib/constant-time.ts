/**
 * Constant-time string comparison.
 *
 * Uses `crypto.subtle.timingSafeEqual` when available (Cloudflare Workers
 * runtime provides it). Falls back to a manual byte-by-byte comparison that
 * does NOT early-exit — it iterates all bytes, XORs each pair, and ORs into
 * an accumulator, returning `accumulator === 0`.
 *
 * The two-tier approach gives us the strongest available constant-time
 * guarantee: hardware-accelerated timing-safe comparison in Workers, and a
 * portable XOR-accumulator fallback for other runtimes (Node.js, test
 * environments, etc.).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // crypto.subtle.timingSafeEqual is available in Workers runtime
  if (typeof crypto !== 'undefined' && crypto.subtle && 'timingSafeEqual' in crypto.subtle) {
    // timingSafeEqual requires equal-length buffers; if lengths differ,
    // the strings are definitely not equal.
    if (aBytes.byteLength !== bBytes.byteLength) return false;
    return (
      crypto.subtle as unknown as { timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean }
    ).timingSafeEqual(aBytes, bBytes);
  }

  // Fallback: constant-time manual comparison (no early exit)
  const len = Math.max(aBytes.length, bBytes.length);
  let accumulator = 0;
  for (let i = 0; i < len; i++) {
    accumulator |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return accumulator === 0;
}
