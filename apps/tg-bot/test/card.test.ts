import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { botSchema } from '@open-care/vault-db';
import { eq } from 'drizzle-orm';
import {
  createTelegramApiMock,
  createTestBotDb,
  getHandleRow,
  sendCard,
  sendStart,
  webhookHeaders,
} from './helpers';

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
// Tests
// ---------------------------------------------------------------------------

describe('/card command', () => {
  it('creates a card_request conversation for registered user', async () => {
    const userId = 200001;
    await sendStart(userId, 'card_user');
    telegramApi.clearSentMessages();

    await sendCard(userId);

    const handleRow = await getHandleRow(userId);
    expect(handleRow).toBeDefined();

    const db = createTestBotDb();
    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.opaque_id, handleRow!.opaque_id))
      .all();

    expect(convRows.length).toBe(1);
    expect(convRows[0]!.kind).toBe('card_request');
    expect(convRows[0]!.status).toBe('pending');
    expect(convRows[0]!.created_at_utc).toBeDefined();
    expect(convRows[0]!.updated_at_utc).toBeDefined();
    expect(convRows[0]!.delivery_code_hash).toBeNull();
    expect(convRows[0]!.delivery_code_last4).toBeNull();
    expect(convRows[0]!.public_beneficiary_ref).toBeNull();

    // Reply
    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('request has been sent');
  });

  it('returns error for unregistered user', async () => {
    const userId = 200002;
    await sendCard(userId);

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Register first');

    // No conversation should exist for this user
    const handleRow = await getHandleRow(userId);
    expect(handleRow).toBeUndefined();
  });

  it('allows multiple card requests from same user', async () => {
    const userId = 200003;
    await sendStart(userId, 'multi_card');
    telegramApi.clearSentMessages();

    // First request
    await sendCard(userId);
    // Second request
    await sendCard(userId);

    const handleRow = await getHandleRow(userId);
    expect(handleRow).toBeDefined();

    const db = createTestBotDb();
    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.opaque_id, handleRow!.opaque_id))
      .all();

    expect(convRows.length).toBe(2);
    expect(convRows[0]!.kind).toBe('card_request');
    expect(convRows[0]!.status).toBe('pending');
    expect(convRows[1]!.kind).toBe('card_request');
    expect(convRows[1]!.status).toBe('pending');

    // Both replies sent
    expect(telegramApi.sentMessages.length).toBe(2);
  });

  it('links conversation to correct opaque_id', async () => {
    const userId = 200004;
    await sendStart(userId, 'link_test');
    telegramApi.clearSentMessages();

    await sendCard(userId);

    const handleRow = await getHandleRow(userId);
    expect(handleRow).toBeDefined();

    const db = createTestBotDb();
    const convRow = await db
      .select()
      .from(conversations)
      .where(eq(conversations.opaque_id, handleRow!.opaque_id))
      .get();

    expect(convRow).toBeDefined();
    expect(convRow!.opaque_id).toBe(handleRow!.opaque_id);
  });

  it('creates separate conversations for different users', async () => {
    const userA = 200005;
    const userB = 200006;

    await sendStart(userA, 'user_a_card');
    await sendStart(userB, 'user_b_card');
    telegramApi.clearSentMessages();

    await sendCard(userA);
    await sendCard(userB);

    const handleA = await getHandleRow(userA);
    const handleB = await getHandleRow(userB);
    expect(handleA).toBeDefined();
    expect(handleB).toBeDefined();
    expect(handleA!.opaque_id).not.toBe(handleB!.opaque_id);

    const db = createTestBotDb();
    const convsA = await db
      .select()
      .from(conversations)
      .where(eq(conversations.opaque_id, handleA!.opaque_id))
      .all();
    const convsB = await db
      .select()
      .from(conversations)
      .where(eq(conversations.opaque_id, handleB!.opaque_id))
      .all();

    expect(convsA.length).toBe(1);
    expect(convsB.length).toBe(1);
    expect(convsA[0]!.id).not.toBe(convsB[0]!.id);
  });

  it('returns error when update has no user ID', async () => {
    await SELF.fetch('https://example.com/tg/webhook', {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify({
        update_id: 200007,
        message: {
          message_id: 200007,
          chat: { id: 999 },
          text: '/card',
        },
      }),
    });

    expect(telegramApi.sentMessages.length).toBe(1);
    expect(telegramApi.sentMessages[0]!.text).toContain('Could not identify your Telegram account');
  });
});
