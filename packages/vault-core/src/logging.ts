/**
 * Structured JSON logging utility for Cloudflare Workers.
 *
 * All log output is single-line JSON objects written to the appropriate
 * `console.*` method. This makes logs machine-parseable in wrangler tail,
 * Cloudflare Logpush, and third-party observability platforms.
 *
 * ## Security: Log Redaction
 *
 * The `redact()` helper strips sensitive fields from objects before logging.
 * However, the **primary defense** is careful context construction at each
 * call site: only pass fields that are explicitly safe to log. `redact()` is
 * a safety net for dynamic objects, not a substitute for discipline.
 *
 * ### Never-log fields (deleted by redact)
 * - Secrets: OPERATOR_TOKEN, ANCHOR_WALLET_SECRET, TG_BOT_TOKEN, TG_ID_HMAC_KEY,
 *   TG_CHAT_ENC_KEY, HELIUS_WEBHOOK_AUTH_HEADER, HELIUS_RPC_URL
 * - Generic sensitive keys: Authorization, token, secret, key, api_key, apikey
 * - Full request bodies: body, payload, rawBody, rawPayloadJson, raw_payload_json
 * - Gift card codes: code, gift_card_code, card_code
 * - Donor memos: memo, memo_text, donor_memo
 * - Telegram identifiers: telegram_user_id, user_id, chat_id, telegram_chat_id, from_id
 * - Beneficiary identifiers: handle, opaque_id, opaqueId, telegram_user_ref,
 *   public_beneficiary_ref, beneficiary_ref, beneficiaryRef, receipt_ref
 * - Free-text fields: service_note
 * - Code-related: encrypted_code_ttl_blob, encrypted_code_expires_at_utc,
 *   delivery_code_hash, delivery_code_last4, telegram_chat_id_enc, telegram_chat_key_version
 *
 * ### Transformed fields
 * - tx_signature, signature, txSignature → first 8 chars + "..."
 * - event_hash, anchored_head_hash, head_hash, prev_hash, hash → first 8 chars + "..."
 * - amount_usdc_minor → category: "small" (<$1), "medium" (<$100), "large" (≥$100)
 * - anchor_wallet_sol_lamports, sol_balance, last_anchor_wallet_sol_lamports → "ok" or "low"
 *
 * ### Safe pass-through fields
 * - method, path, status, statusCode, latency_ms, duration_ms, response_time_ms
 * - requestId, request_id, sequence_no, anchored_head_sequence_no
 * - event_type, source, trigger_source, cluster, SOLANA_CLUSTER
 * - accepted, duplicates, inserted, skipped, processed, ignored, failed
 * - command, version, deploy_version, gift_card_count, service
 * - conversation_id, anchor_runs_id, attempt_count, reason
 * - delivered, auth_result, forward_status, error (message only)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string; // ISO-8601
  requestId?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------

/**
 * Write a structured JSON log entry to the console.
 *
 * Maps `level` to the corresponding `console.*` method:
 * - `'info'`  → `console.info`
 * - `'warn'`  → `console.warn`
 * - `'error'` → `console.error`
 */
export function log(
  level: LogEntry['level'],
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console[level](JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

/** Log an informational message. */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  log('info', message, context);
}

/** Log a warning. */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  log('warn', message, context);
}

/** Log an error. */
export function logError(message: string, context?: Record<string, unknown>): void {
  log('error', message, context);
}

// ---------------------------------------------------------------------------
// Request ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a short, unique request ID for log correlation.
 *
 * Format: `"req_"` + 8 random lowercase hex characters.
 * Uses `crypto.randomUUID()` (available in Workers runtime).
 */
export function generateRequestId(): string {
  return 'req_' + crypto.randomUUID().split('-')[0]!.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/** Keys that must never appear in logs — deleted entirely. */
const DELETE_KEYS = new Set([
  // Secrets
  'OPERATOR_TOKEN',
  'ANCHOR_WALLET_SECRET',
  'TG_BOT_TOKEN',
  'TG_ID_HMAC_KEY',
  'TG_CHAT_ENC_KEY',
  'HELIUS_WEBHOOK_AUTH_HEADER',
  'HELIUS_RPC_URL',
  // Generic sensitive
  'Authorization',
  'authorization',
  'token',
  'secret',
  'key',
  'api_key',
  'apikey',
  // Full request bodies
  'body',
  'payload',
  'rawBody',
  'rawPayloadJson',
  'raw_payload_json',
  // Gift card codes
  'code',
  'gift_card_code',
  'card_code',
  // Donor memos
  'memo',
  'memo_text',
  'donor_memo',
  // Telegram identifiers
  'telegram_user_id',
  'user_id',
  'chat_id',
  'telegram_chat_id',
  'from_id',
  // Beneficiary identifiers
  'handle',
  'opaque_id',
  'opaqueId',
  'telegram_user_ref',
  'public_beneficiary_ref',
  'beneficiary_ref',
  'beneficiaryRef',
  'receipt_ref',
  // Free-text
  'service_note',
  // Code-related
  'encrypted_code_ttl_blob',
  'encrypted_code_expires_at_utc',
  'delivery_code_hash',
  'delivery_code_last4',
  'telegram_chat_id_enc',
  'telegram_chat_key_version',
]);

/** Keys whose values should be truncated to first 8 chars + "...". */
const TRUNCATE_KEYS = new Set([
  'tx_signature',
  'signature',
  'txSignature',
  'event_hash',
  'anchored_head_hash',
  'head_hash',
  'prev_hash',
  'hash',
]);

/** Keys whose values should be replaced with a category label. */
const CATEGORIZE_AMOUNT_KEYS = new Set(['amount_usdc_minor']);

const CATEGORIZE_BALANCE_KEYS = new Set([
  'anchor_wallet_sol_lamports',
  'sol_balance',
  'last_anchor_wallet_sol_lamports',
]);

/** Keys that are explicitly safe to pass through. */
const SAFE_KEYS = new Set([
  'method',
  'path',
  'status',
  'statusCode',
  'latency_ms',
  'duration_ms',
  'response_time_ms',
  'requestId',
  'request_id',
  'sequence_no',
  'anchored_head_sequence_no',
  'event_type',
  'source',
  'trigger_source',
  'cluster',
  'SOLANA_CLUSTER',
  'accepted',
  'duplicates',
  'inserted',
  'skipped',
  'processed',
  'ignored',
  'failed',
  'command',
  'version',
  'deploy_version',
  'gift_card_count',
  'service',
  'conversation_id',
  'anchor_runs_id',
  'attempt_count',
  'reason',
  'delivered',
  'auth_result',
  'forward_status',
  'error',
  'error_code',
  'event_count',
  'total_rows',
  'signatures_fetched',
  'has_arg',
  'amount_category',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categorizeAmount(value: unknown): 'small' | 'medium' | 'large' {
  try {
    const n = BigInt(String(value));
    if (n < 1_000_000n) return 'small'; // < $1
    if (n < 100_000_000n) return 'medium'; // < $100
    return 'large'; // >= $100
  } catch {
    return 'medium'; // fallback for unparseable values
  }
}

function categorizeBalance(value: unknown): 'ok' | 'low' {
  const MIN_SOL_LAMPORTS = 50_000_000;
  try {
    const n = Number(value);
    if (Number.isNaN(n)) return 'low';
    return n >= MIN_SOL_LAMPORTS ? 'ok' : 'low';
  } catch {
    return 'low';
  }
}

function truncateValue(value: unknown): string {
  const s = String(value);
  return s.length > 8 ? s.slice(0, 8) + '...' : s;
}

// ---------------------------------------------------------------------------
// Public redact function
// ---------------------------------------------------------------------------

/**
 * Sanitize an object for safe logging by removing or transforming sensitive fields.
 *
 * Rules (applied in order):
 * 1. Keys in the DELETE set → removed entirely
 * 2. Keys in the TRUNCATE set → value truncated to first 8 chars + "..."
 * 3. Keys in the AMOUNT category set → value replaced with "small"/"medium"/"large"
 * 4. Keys in the BALANCE category set → value replaced with "ok"/"low"
 * 5. Keys in the SAFE set → passed through as-is
 * 6. Any other key → removed (conservative: if unsure, redact)
 *
 * Nested objects are NOT recursed into — the entire nested value is removed
 * unless the key is in the SAFE set and the value is a primitive.
 *
 * @returns A new object containing only safe, sanitized fields.
 */
export function redact(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (obj === null || obj === undefined) return {};

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (DELETE_KEYS.has(key)) {
      continue;
    }

    if (TRUNCATE_KEYS.has(key)) {
      result[key] = truncateValue(value);
      continue;
    }

    if (CATEGORIZE_AMOUNT_KEYS.has(key)) {
      result['amount_category'] = categorizeAmount(value);
      continue;
    }

    if (CATEGORIZE_BALANCE_KEYS.has(key)) {
      result[key] = categorizeBalance(value);
      continue;
    }

    if (SAFE_KEYS.has(key)) {
      // Only pass through primitives; drop nested objects/arrays
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        result[key] = value;
      }
      // else: drop nested objects even for safe keys (conservative)
      continue;
    }

    // Unknown key — conservative: drop it
  }

  return result;
}
