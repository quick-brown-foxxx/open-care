import type { Context } from 'hono';

/**
 * Set Cache-Control header on a Hono context.
 * Default max-age is 60 seconds.
 */
export function withCache(c: Context, maxAge = 60): void {
  c.header('Cache-Control', `public, max-age=${maxAge}`);
}
