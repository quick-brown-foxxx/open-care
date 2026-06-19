import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { botSchema } from '@open-care/vault-db';
import { eq } from 'drizzle-orm';
import { createTelegramApiMock, createTestBotDb, getHandleRow, webhookHeaders } from './helpers';

const { conversations } = botSchema;

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
// Helpers
// ---------------------------------------------------------------------------

function makeUpdateBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    update_id: 123456789,
    message: {
      message_id: 1,
      from: { id: 111222333, first_name: 'TestUser' },
      chat: { id: 111222333 },
      text: '/start testuser',
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /tg/webhook', () => {
  // -- Auth / security -------------------------------------------------------

  it('returns { ok: true } when webhook secret is valid', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: makeUpdateBody({ text: '/help' }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });

  it('returns { ok: true } when webhook secret is wrong (does not leak)', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret',
      },
      body: makeUpdateBody({ text: '/start alice' }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
    // No outbound Telegram API attempt should have been made.
    expect(telegramApi.telegramApiAttempts.length).toBe(0);
  });

  it('returns { ok: true } when webhook secret header is missing', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: makeUpdateBody({ text: '/start alice' }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
    expect(telegramApi.telegramApiAttempts.length).toBe(0);
  });

  // -- Body parsing ----------------------------------------------------------

  it('returns { ok: true } for non-JSON body', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: 'not json at all',
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });

  it('returns { ok: true } for update without message (callback_query)', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 999,
        callback_query: { id: '1', from: { id: 111 }, data: 'test' },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });

  it('returns { ok: true } for non-command text message', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 111, first_name: 'User' },
          chat: { id: 111 },
          text: 'hello there',
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
    expect(telegramApi.telegramApiAttempts.length).toBe(0);
  });

  // -- /start command --------------------------------------------------------

  it('processes /start with handle and registers user', async () => {
    const userId = 111222333;
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: userId, first_name: 'Alice' },
          chat: { id: userId },
          text: '/start alice_care',
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);

    // Verify DB state
    const row = await getHandleRow(userId);
    expect(row).toBeDefined();
    expect(row!.handle).toBe('alice_care');
    expect(row!.is_active).toBe(1);

    // Verify reply was sent
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Registered as @alice_care');
  });

  it('processes /start without handle and sends prompt', async () => {
    const userId = 222333444;
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 2,
        message: {
          message_id: 2,
          from: { id: userId, first_name: 'Bob' },
          chat: { id: userId },
          text: '/start',
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);

    // No DB entry should be created
    const row = await getHandleRow(userId);
    expect(row).toBeUndefined();

    // Prompt reply was sent
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Welcome!');
    expect(telegramApi.sentMessages[0]!.text).toContain('/start');
  });

  it('processes /start@botname with handle', async () => {
    const userId = 333444555;
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 3,
        message: {
          message_id: 3,
          from: { id: userId, first_name: 'Carol' },
          chat: { id: userId },
          text: '/start@MyBot carol_care',
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);

    const row = await getHandleRow(userId);
    expect(row).toBeDefined();
    expect(row!.handle).toBe('carol_care');
  });

  // -- /whoami command -------------------------------------------------------

  it('processes /whoami for registered user', async () => {
    const userId = 444555666;
    // Register first
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 4,
        message: {
          message_id: 4,
          from: { id: userId, first_name: 'Dave' },
          chat: { id: userId },
          text: '/start dave_care',
        },
      }),
    });
    telegramApi.clearSentMessages(); // Reset for next check

    // Now /whoami
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 5,
        message: {
          message_id: 5,
          from: { id: userId, first_name: 'Dave' },
          chat: { id: userId },
          text: '/whoami',
        },
      }),
    });
    expect(response.status).toBe(200);
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('registered as @dave_care');
  });

  it('processes /whoami for unregistered user', async () => {
    const userId = 555666777;
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 6,
        message: {
          message_id: 6,
          from: { id: userId, first_name: 'Eve' },
          chat: { id: userId },
          text: '/whoami',
        },
      }),
    });
    expect(response.status).toBe(200);
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('not registered');
  });

  // -- /card command ---------------------------------------------------------

  it('processes /card for registered user and creates conversation', async () => {
    const userId = 666777888;
    // Register
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 7,
        message: {
          message_id: 7,
          from: { id: userId, first_name: 'Frank' },
          chat: { id: userId },
          text: '/start frank_care',
        },
      }),
    });
    telegramApi.clearSentMessages();

    // Request card
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 8,
        message: {
          message_id: 8,
          from: { id: userId, first_name: 'Frank' },
          chat: { id: userId },
          text: '/card',
        },
      }),
    });
    expect(response.status).toBe(200);

    // Verify conversation created
    const db = createTestBotDb();
    const handleRow = await getHandleRow(userId);
    expect(handleRow).toBeDefined();

    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.opaque_id, handleRow!.opaque_id))
      .all();
    expect(convRows.length).toBe(1);
    expect(convRows[0]!.kind).toBe('card_request');
    expect(convRows[0]!.status).toBe('pending');

    // Reply was sent
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('request has been sent');
  });

  it('processes /card for unregistered user with error reply', async () => {
    const userId = 777888999;
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 9,
        message: {
          message_id: 9,
          from: { id: userId, first_name: 'Grace' },
          chat: { id: userId },
          text: '/card',
        },
      }),
    });
    expect(response.status).toBe(200);
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Register first');
  });

  // -- /help command ---------------------------------------------------------

  it('processes /help and returns command list', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 10,
        message: {
          message_id: 10,
          from: { id: 888999000, first_name: 'Hank' },
          chat: { id: 888999000 },
          text: '/help',
        },
      }),
    });
    expect(response.status).toBe(200);
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Available commands');
    expect(telegramApi.sentMessages[0]!.text).toContain('/start');
    expect(telegramApi.sentMessages[0]!.text).toContain('/whoami');
    expect(telegramApi.sentMessages[0]!.text).toContain('/card');
    expect(telegramApi.sentMessages[0]!.text).toContain('/help');
  });

  // -- Unknown command -------------------------------------------------------

  it('returns { ok: true } for unknown command', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 11,
        message: {
          message_id: 11,
          from: { id: 999000111, first_name: 'Ivy' },
          chat: { id: 999000111 },
          text: '/unknown_command',
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
    expect(telegramApi.telegramApiAttempts.length).toBe(0);
  });

  // -- Edge cases ------------------------------------------------------------

  it('returns { ok: true } for message without from field', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 12,
        message: {
          message_id: 12,
          chat: { id: 123 },
          text: '/start test',
        },
      }),
    });
    expect(response.status).toBe(200);
    // The handler should still return ok (command handler returns error text
    // but webhook handler sends it as a reply — but without chat.id it can't send)
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });

  it('returns { ok: true } for message without chat field', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 13,
        message: {
          message_id: 13,
          from: { id: 456, first_name: 'NoChat' },
          text: '/help',
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });

  it('returns { ok: true } for message without text field', async () => {
    const response = await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 14,
        message: {
          message_id: 14,
          from: { id: 789, first_name: 'PhotoUser' },
          chat: { id: 789 },
          photo: [{ file_id: 'abc', width: 100, height: 100 }],
        },
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });
});
