import { createMiddleware } from 'hono/factory';
import type { Env } from './env.js';
import { errorResponse } from './errors.js';
import { constantTimeEqual } from '@open-care/vault-core';

/**
 * Hono middleware that validates the Helius webhook Authorization header.
 *
 * - Extracts `Authorization` header
 * - Returns 401 if missing
 * - Strips "Bearer " prefix (case-sensitive, exact match)
 * - Compares remaining token against `c.env.HELIUS_WEBHOOK_AUTH_HEADER`
 *   using constant-time comparison
 * - Returns 401 on mismatch, calls `next()` on match
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing Authorization header', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse('UNAUTHORIZED', 'Authorization header must use Bearer scheme', 401);
  }

  const token = authHeader.slice(7); // remove "Bearer " prefix

  if (!constantTimeEqual(token, c.env.HELIUS_WEBHOOK_AUTH_HEADER)) {
    return errorResponse('UNAUTHORIZED', 'Invalid authorization token', 401);
  }

  await next();
});
