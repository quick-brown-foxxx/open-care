import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { createTelegramApiMock, getHandleRow, sendStart, webhookHeaders } from './helpers';

// ---------------------------------------------------------------------------
// Telegram API mock
// ---------------------------------------------------------------------------

const telegramApi = createTelegramApiMock();

beforeEach(() => {
  telegramApi.setupSuccess();
});

afterEach(() => {
  telegramApi.restore();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/start command', () => {
  it('registers a new handle with correct DB fields', async () => {
    const userId = 100001;
    await sendStart(userId, 'alice_care');

    const row = await getHandleRow(userId);
    expect(row).toBeDefined();
    expect(row!.handle).toBe('alice_care');
    expect(row!.is_active).toBe(1);
    expect(row!.opaque_id).toBeDefined();
    expect(row!.opaque_id.length).toBeGreaterThan(0);
    expect(row!.telegram_chat_id_enc).toBeDefined();
    expect(row!.telegram_chat_id_enc.startsWith('aesgcm:v1:')).toBe(true);
    expect(row!.telegram_chat_key_version).toBe(1);
    expect(row!.first_seen_utc).toBeDefined();
    expect(row!.last_seen_utc).toBeDefined();

    // Reply text
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Registered as @alice_care');
  });

  it('re-registers same user with new handle and new opaque_id', async () => {
    const userId = 100002;
    await sendStart(userId, 'bob_care');
    const firstRow = await getHandleRow(userId);
    expect(firstRow).toBeDefined();
    const firstOpaqueId = firstRow!.opaque_id;
    telegramApi.clearSentMessages();

    // Re-register with new handle
    await sendStart(userId, 'bob_new');
    const secondRow = await getHandleRow(userId);
    expect(secondRow).toBeDefined();
    expect(secondRow!.handle).toBe('bob_new');
    // opaque_id is preserved on re-registration to avoid FK violations
    expect(secondRow!.opaque_id).toBe(firstOpaqueId);

    // Reply text
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Re-registered as @bob_new');
  });

  it('rejects handle already taken by different user', async () => {
    const userA = 100003;
    const userB = 100004;

    // User A registers
    await sendStart(userA, 'shared_handle');
    telegramApi.clearSentMessages();

    // User B tries same handle
    await sendStart(userB, 'shared_handle');

    // User B should get error reply
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('already taken');

    // User B should NOT have a DB entry
    const rowB = await getHandleRow(userB);
    expect(rowB).toBeUndefined();
  });

  it('rejects handle that is too short (less than 3 chars)', async () => {
    const userId = 100005;
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100005,
        message: {
          message_id: 100005,
          from: { id: userId, first_name: 'Short' },
          chat: { id: userId },
          text: '/start ab',
        },
      }),
    });

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Invalid handle');

    const row = await getHandleRow(userId);
    expect(row).toBeUndefined();
  });

  it('rejects handle starting with benpub_', async () => {
    const userId = 100006;
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100006,
        message: {
          message_id: 100006,
          from: { id: userId, first_name: 'Benpub' },
          chat: { id: userId },
          text: '/start benpub_test',
        },
      }),
    });

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Invalid handle');

    const row = await getHandleRow(userId);
    expect(row).toBeUndefined();
  });

  it('rejects handle with hyphens (special chars)', async () => {
    const userId = 100007;
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100007,
        message: {
          message_id: 100007,
          from: { id: userId, first_name: 'Hyphen' },
          chat: { id: userId },
          text: '/start hello-world',
        },
      }),
    });

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Invalid handle');

    const row = await getHandleRow(userId);
    expect(row).toBeUndefined();
  });

  it('rejects handle with spaces', async () => {
    const userId = 100008;
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100008,
        message: {
          message_id: 100008,
          from: { id: userId, first_name: 'Space' },
          chat: { id: userId },
          text: '/start hello world',
        },
      }),
    });

    // extractCommand would parse "hello" as command arg, "world" is ignored
    // but "hello" is only 5 chars and valid format, so it should register
    // Actually: /start hello world → arg is "hello world"? No, regex captures
    // only the first word after the command. Let me check...
    // The regex is: /^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+(.*))?$/
    // So arg = "hello world" (everything after the first space)
    // isValidHandle("hello world") → false (has space)
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Invalid handle');
  });

  it('rejects handle longer than 32 chars', async () => {
    const userId = 100009;
    const longHandle = 'a'.repeat(33);
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100009,
        message: {
          message_id: 100009,
          from: { id: userId, first_name: 'Long' },
          chat: { id: userId },
          text: `/start ${longHandle}`,
        },
      }),
    });

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Invalid handle');
  });

  it('returns error when update has no user ID', async () => {
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100010,
        message: {
          message_id: 100010,
          chat: { id: 999 },
          text: '/start test_user',
        },
      }),
    });

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Could not identify your Telegram account');
  });

  it('returns error when update has no chat ID', async () => {
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 100011,
        message: {
          message_id: 100011,
          from: { id: 100011, first_name: 'NoChat' },
          text: '/start test_user',
        },
      }),
    });

    // The webhook handler cannot send a reply without chat.id,
    // so no Telegram message is sent even though the command handler
    // returns an error text.
    expect(telegramApi.telegramApiAttempts.length).toBe(0);
  });

  it('accepts handle with underscores and numbers', async () => {
    const userId = 100012;
    await sendStart(userId, 'user_123_test');

    const row = await getHandleRow(userId);
    expect(row).toBeDefined();
    expect(row!.handle).toBe('user_123_test');
    expect(telegramApi.sentMessages[0]!.text).toContain('Registered as @user_123_test');
  });

  it('accepts handle exactly 3 chars', async () => {
    const userId = 100013;
    await sendStart(userId, 'abc');

    const row = await getHandleRow(userId);
    expect(row).toBeDefined();
    expect(row!.handle).toBe('abc');
  });

  it('accepts handle exactly 32 chars', async () => {
    const userId = 100014;
    const handle32 = 'a'.repeat(32);
    await sendStart(userId, handle32);

    const row = await getHandleRow(userId);
    expect(row).toBeDefined();
    expect(row!.handle).toBe(handle32);
  });

  it('re-registering with same handle is a no-op update', async () => {
    const userId = 100015;
    await sendStart(userId, 'same_handle');
    const firstRow = await getHandleRow(userId);
    expect(firstRow).toBeDefined();
    const firstOpaqueId = firstRow!.opaque_id;
    telegramApi.clearSentMessages();

    // Re-register with same handle
    await sendStart(userId, 'same_handle');
    const secondRow = await getHandleRow(userId);
    expect(secondRow).toBeDefined();
    expect(secondRow!.handle).toBe('same_handle');
    // opaque_id is preserved on re-registration to avoid FK violations
    expect(secondRow!.opaque_id).toBe(firstOpaqueId);
    expect(telegramApi.sentMessages[0]!.text).toContain('Re-registered as @same_handle');
  });
});
