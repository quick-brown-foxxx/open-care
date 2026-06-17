/**
 * Standard JSON error response shape returned by all read endpoints.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Build a generic error Response with the given status code.
 */
export function errorResponse(code: string, message: string, status: number): Response {
  const body: ErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

/**
 * Convenience: 400 BAD_REQUEST.
 */
export function badRequestResponse(message: string): Response {
  return errorResponse('BAD_REQUEST', message, 400);
}

/**
 * Convenience: 500 INTERNAL_ERROR.
 */
export function internalErrorResponse(message: string): Response {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

/**
 * Convenience: 503 UNAVAILABLE.
 */
export function unavailableResponse(message: string): Response {
  return errorResponse('UNAVAILABLE', message, 503);
}
