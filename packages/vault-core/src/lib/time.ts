/**
 * Returns the current UTC time as an ISO-8601 string with second precision.
 *
 * Format: `YYYY-MM-DDTHH:mm:ssZ` (e.g. `"2026-06-18T15:30:00Z"`).
 * Milliseconds are stripped for consistency across all consumers.
 */
export function utcNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
