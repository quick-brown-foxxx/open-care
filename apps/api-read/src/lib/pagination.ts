/**
 * Shared pagination helpers for read API route handlers.
 *
 * Parses and validates `limit` and `after_sequence_no` query parameters
 * from Hono request contexts.
 */

/**
 * Parse a positive integer from a query parameter string.
 *
 * Returns `undefined` when the parameter is not provided (caller applies
 * the default).  Returns an error message string when the value is present
 * but invalid (not a positive integer).
 */
export function parsePositiveInt(
  value: string | undefined,
  paramName: string,
): { ok: true; value: number } | { ok: false; message: string } | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return {
      ok: false,
      message: `'${paramName}' must be a positive integer, got '${value}'`,
    };
  }
  return { ok: true, value: n };
}

/**
 * Validate a limit parameter.
 *
 * @param raw - Raw query string value (or undefined).
 * @param defaultLimit - Fallback when the parameter is absent.
 * @param maxLimit - Hard ceiling; values above this are rejected with 400.
 * @returns The validated limit, or a 400 Response if invalid.
 */
export function validateLimit(
  raw: string | undefined,
  defaultLimit: number,
  maxLimit: number,
): number | Response {
  const result = parsePositiveInt(raw, 'limit');
  if (result === undefined) return defaultLimit;
  if (!result.ok) return Response.json(
    { error: { code: 'BAD_REQUEST', message: result.message } },
    { status: 400 },
  );
  if (result.value > maxLimit) {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: `'limit' must not exceed ${maxLimit}, got ${result.value}` } },
      { status: 400 },
    );
  }
  return result.value;
}

/**
 * Validate an after_sequence_no cursor parameter.
 *
 * @param raw - Raw query string value (or undefined).
 * @returns The cursor value (undefined when absent), or a 400 Response if invalid.
 */
export function validateCursor(
  raw: string | undefined,
): number | undefined | Response {
  const result = parsePositiveInt(raw, 'after_sequence_no');
  if (result === undefined) return undefined;
  if (!result.ok) return Response.json(
    { error: { code: 'BAD_REQUEST', message: result.message } },
    { status: 400 },
  );
  return result.value;
}
