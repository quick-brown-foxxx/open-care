/**
 * Webhook secret verification with constant-time comparison.
 *
 * Telegram sends an `X-Telegram-Bot-Api-Secret-Token` header with each
 * webhook request. We compare it against the configured secret using a
 * constant-time algorithm to prevent timing side-channel attacks.
 */

import { constantTimeEqual } from '@open-care/vault-core';

/**
 * Verify the Telegram webhook secret token header.
 *
 * @param headerValue - The value of the `X-Telegram-Bot-Api-Secret-Token`
 *   header, or `null`/`undefined` if the header is absent.
 * @param secret - The configured webhook secret from `TG_WEBHOOK_SECRET`.
 * @returns `true` if the header matches the secret, `false` otherwise.
 */
export function verifyWebhookSecret(
  headerValue: string | null | undefined,
  secret: string,
): boolean {
  if (headerValue === null || headerValue === undefined) {
    return false;
  }
  return constantTimeEqual(headerValue, secret);
}
