/** Standardized error response shape used by all Workers */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: Record<string, unknown>;
  };
}
