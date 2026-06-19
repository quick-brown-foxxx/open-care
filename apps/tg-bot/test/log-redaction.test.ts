import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SELF } from 'cloudflare:test';
import {
  createCardRequestConversation,
  createTelegramApiMock,
  registerUser,
  webhookHeaders,
} from './helpers';

// ---------------------------------------------------------------------------
// Log capture helpers
// ---------------------------------------------------------------------------

/** Keys that must never appear as object keys in log output. */
const FORBIDDEN_TELEGRAM_KEYS = [
  'user_id',
  'chat_id',
  'telegram_user_id',
  'telegram_chat_id',
  'from_id',
];

const FORBIDDEN_CODE_KEYS = ['code', 'gift_card_code', 'card_code'];

/**
 * Collect all JSON-stringified log lines from an array of console spies.
 * Each spy call is `console.level(jsonString)`.
 */
function collectLogLines(spies: ReturnType<typeof vi.spyOn>[]): string[] {
  const lines: string[] = [];
  for (const spy of spies) {
    for (const call of spy.mock.calls) {
      if (call.length > 0 && typeof call[0] === 'string') {
        lines.push(call[0]);
      }
    }
  }
  return lines;
}

/** Parse each log line as JSON. Unparseable lines are kept as raw strings. */
function parseLogLines(lines: string[]): Record<string, unknown>[] {
  return lines.map((line) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return { _raw: line };
    }
  });
}

/** Check whether any top-level key in the object is in the forbidden set. */
function hasForbiddenKey(obj: Record<string, unknown>, forbiddenKeys: string[]): boolean {
  return Object.keys(obj).some((k) => forbiddenKeys.includes(k));
}

/**
 * Recursively check an object (and nested objects/arrays) for forbidden keys.
 * Also checks string values for forbidden substrings.
 */
function deepContainsForbidden(
  value: unknown,
  forbiddenKeys: string[],
  forbiddenSubstrings: string[],
): boolean {
  if (typeof value === 'string') {
    // Check if the string value contains any forbidden substring
    for (const sub of forbiddenSubstrings) {
      if (value.includes(sub)) return true;
    }
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => deepContainsForbidden(item, forbiddenKeys, forbiddenSubstrings));
  }

  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Check keys
    if (hasForbiddenKey(obj, forbiddenKeys)) return true;
    // Check values recursively
    return Object.values(obj).some((v) =>
      deepContainsForbidden(v, forbiddenKeys, forbiddenSubstrings),
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Telegram API mock
// ---------------------------------------------------------------------------

const telegramApi = createTelegramApiMock();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Log redaction', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    telegramApi.setupSuccess();
    infoSpy = vi.spyOn(console, 'info');
    warnSpy = vi.spyOn(console, 'warn');
    errorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    telegramApi.restore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // -- Registration logs ---------------------------------------------------

  describe('Registration logs (/start)', () => {
    it('contain no plaintext Telegram identifiers', async () => {
      const userId = 500001;

      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userId,
          message: {
            message_id: userId,
            from: { id: userId, first_name: 'RedactReg' },
            chat: { id: userId },
            text: '/start logredact_user',
          },
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      // No forbidden keys at any level in any parsed log entry
      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
      }

      // No raw log line contains the plaintext user ID value
      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(String(userId));
    });

    it('contain no plaintext identifiers on re-registration', async () => {
      const userId = 500002;

      // First registration
      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userId,
          message: {
            message_id: userId,
            from: { id: userId, first_name: 'ReReg' },
            chat: { id: userId },
            text: '/start rereg_user',
          },
        }),
      });

      // Clear spies to isolate re-registration logs
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();

      // Re-registration with new handle
      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userId + 1,
          message: {
            message_id: userId + 1,
            from: { id: userId, first_name: 'ReReg' },
            chat: { id: userId },
            text: '/start rereg_user2',
          },
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
      }

      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(String(userId));
    });

    it('contain no plaintext identifiers on failed registration (taken handle)', async () => {
      const userA = 500003;
      const userB = 500004;

      // User A registers the handle first
      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userA,
          message: {
            message_id: userA,
            from: { id: userA, first_name: 'UserA' },
            chat: { id: userA },
            text: '/start taken_handle',
          },
        }),
      });

      // Clear spies
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();

      // User B tries the same handle
      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userB,
          message: {
            message_id: userB,
            from: { id: userB, first_name: 'UserB' },
            chat: { id: userB },
            text: '/start taken_handle',
          },
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
      }

      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(String(userA));
      expect(allLogText).not.toContain(String(userB));
    });
  });

  // -- Card request logs ---------------------------------------------------

  describe('Card request logs (/card)', () => {
    it('contain no plaintext Telegram identifiers', async () => {
      const userId = 500005;

      // Register first
      await registerUser(userId, 'cardlog_user');

      // Clear spies to isolate /card logs
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();

      // Send /card
      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userId + 1000,
          message: {
            message_id: userId + 1000,
            from: { id: userId, first_name: 'CardUser' },
            chat: { id: userId },
            text: '/card',
          },
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
      }

      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(String(userId));
    });

    it('contain no plaintext identifiers for unregistered user', async () => {
      const userId = 500006;

      // Send /card without registering
      await SELF.fetch('https://example.com/tg/webhook', {
        method: 'POST',
        headers: webhookHeaders(),
        body: JSON.stringify({
          update_id: userId + 1000,
          message: {
            message_id: userId + 1000,
            from: { id: userId, first_name: 'Unreg' },
            chat: { id: userId },
            text: '/card',
          },
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
      }

      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(String(userId));
    });
  });

  // -- Send-code logs ------------------------------------------------------

  describe('Send-code logs (POST /tg/internal/send-code)', () => {
    it('contain no plaintext gift card codes on successful delivery', async () => {
      const userId = 500007;
      const opaqueId = await registerUser(userId, 'sendlog_user');
      const convId = await createCardRequestConversation(userId);

      // Clear spies to isolate send-code logs
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();

      const giftCode = 'GIFT-REDACT-TEST-9999';
      await SELF.fetch('https://example.com/tg/internal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opaque_id: opaqueId,
          code: giftCode,
          conversation_id: convId,
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      // No forbidden code keys at any level
      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_CODE_KEYS, [])).toBe(false);
      }

      // No raw log line contains the plaintext gift code
      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(giftCode);
    });

    it('contain no plaintext gift card codes on failed delivery', async () => {
      const userId = 500008;
      const opaqueId = await registerUser(userId, 'faillog_user');
      const convId = await createCardRequestConversation(userId);

      // First deliver successfully
      await SELF.fetch('https://example.com/tg/internal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opaque_id: opaqueId,
          code: 'GIFT-FIRST-1111',
          conversation_id: convId,
        }),
      });

      // Clear spies
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();

      // Second delivery attempt (should fail with ALREADY_DELIVERED)
      const giftCode = 'GIFT-SECOND-2222';
      await SELF.fetch('https://example.com/tg/internal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opaque_id: opaqueId,
          code: giftCode,
          conversation_id: convId,
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_CODE_KEYS, [])).toBe(false);
      }

      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(giftCode);
    });

    it('contain no plaintext identifiers in send-code error logs', async () => {
      const userId = 500009;
      const opaqueId = await registerUser(userId, 'iderrlog_user');
      const convId = await createCardRequestConversation(userId);

      // First deliver successfully
      await SELF.fetch('https://example.com/tg/internal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opaque_id: opaqueId,
          code: 'GIFT-FIRST-3333',
          conversation_id: convId,
        }),
      });

      // Clear spies
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();

      // Second delivery attempt (ALREADY_DELIVERED error)
      await SELF.fetch('https://example.com/tg/internal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opaque_id: opaqueId,
          code: 'GIFT-SECOND-4444',
          conversation_id: convId,
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      // No Telegram identifier keys in error logs
      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
      }

      // No plaintext user ID in raw log text
      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain(String(userId));
    });

    it('contain no plaintext identifiers on validation error (bad request)', async () => {
      // Send a request missing required fields — triggers validation error logging
      await SELF.fetch('https://example.com/tg/internal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opaque_id: 'some-id',
          code: 'CODE-1234',
          // conversation_id intentionally missing
        }),
      });

      const logLines = collectLogLines([infoSpy, warnSpy, errorSpy]);
      const parsed = parseLogLines(logLines);

      for (const entry of parsed) {
        expect(deepContainsForbidden(entry, FORBIDDEN_TELEGRAM_KEYS, [])).toBe(false);
        expect(deepContainsForbidden(entry, FORBIDDEN_CODE_KEYS, [])).toBe(false);
      }

      const allLogText = logLines.join('\n');
      expect(allLogText).not.toContain('CODE-1234');
    });
  });
});
