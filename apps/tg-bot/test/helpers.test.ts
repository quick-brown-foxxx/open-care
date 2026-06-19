import { describe, it, expect, afterEach } from 'vitest';
import { createTelegramApiMock } from './helpers';

const telegramApi = createTelegramApiMock();

afterEach(() => {
  telegramApi.restore();
});

describe('createTelegramApiMock', () => {
  it('records malformed Telegram API attempts that are not valid sent messages', async () => {
    telegramApi.setupSuccess();

    const response = await fetch('https://api.telegram.org/bottest-token/sendMessage', {
      method: 'POST',
      body: JSON.stringify({ chat_id: 123 }),
    });

    expect(response.status).toBe(200);
    expect(telegramApi.telegramApiAttempts.length).toBe(1);
    expect(telegramApi.telegramApiAttempts[0]!.parsedBody).toEqual({ chat_id: 123 });
    expect(telegramApi.sentMessages.length).toBe(0);
  });

  it('records Telegram API attempts before failing invalid JSON bodies', async () => {
    telegramApi.setupSuccess();

    await expect(
      fetch('https://api.telegram.org/bottest-token/sendMessage', {
        method: 'POST',
        body: 'not json',
      }),
    ).rejects.toThrow();

    expect(telegramApi.telegramApiAttempts.length).toBe(1);
    expect(telegramApi.telegramApiAttempts[0]!.rawBody).toBe('not json');
    expect(telegramApi.telegramApiAttempts[0]!.parseError).toEqual(expect.any(String));
    expect(telegramApi.sentMessages.length).toBe(0);
  });
});
