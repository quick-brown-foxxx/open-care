import type { Context, Next } from 'hono';
import type { Env } from './env';
import { logInfo, logWarn, constantTimeEqual } from '@open-care/vault-core';

/**
 * Hono middleware that validates the Authorization Bearer token against
 * c.env.OPERATOR_TOKEN using constant-time comparison.
 *
 * - Missing Authorization header → 401 UNAUTHORIZED
 * - Non-Bearer scheme → 400 BAD_REQUEST
 * - Invalid token → 401 UNAUTHORIZED
 * - Valid token → calls next()
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    logWarn('Operator auth failed: missing Authorization header');
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header.' } },
      401,
    );
  }

  if (!authHeader.startsWith('Bearer ')) {
    logWarn('Operator auth failed: non-Bearer scheme');
    return c.json(
      { error: { code: 'BAD_REQUEST', message: 'Authorization header must use Bearer scheme.' } },
      400,
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!constantTimeEqual(token, c.env.OPERATOR_TOKEN)) {
    logWarn('Operator auth failed: invalid token');
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid operator token.' } }, 401);
  }

  logInfo('Operator auth succeeded');

  await next();
}
