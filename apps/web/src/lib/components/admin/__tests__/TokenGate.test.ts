import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TokenGate from '../TokenGate.svelte';

// Mock the state and API modules
vi.mock('$lib/state/token.svelte.js', () => ({
  setToken: vi.fn(),
  clearToken: vi.fn(),
  hasToken: vi.fn(() => false),
  getToken: vi.fn(() => null),
}));

vi.mock('$lib/api/operator.js', () => ({
  getPendingRequests: vi.fn(),
}));

afterEach(() => cleanup());

describe('TokenGate', () => {
  it('renders password input and submit button', () => {
    render(TokenGate);
    expect(screen.getByPlaceholderText('Введите токен оператора')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Войти/i })).toBeTruthy();
  });

  it('input has type="password"', () => {
    render(TokenGate);
    const input = screen.getByPlaceholderText('Введите токен оператора');
    expect(input.getAttribute('type')).toBe('password');
  });

  it('shows error message on invalid token', async () => {
    const { getPendingRequests } = await import('$lib/api/operator.js');
    vi.mocked(getPendingRequests).mockResolvedValue({
      ok: false,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'Неверный токен' },
    });

    render(TokenGate);
    const input = screen.getByPlaceholderText('Введите токен оператора');
    await fireEvent.input(input, { target: { value: 'bad-token' } });
    const button = screen.getByRole('button', { name: /Войти/i });
    await fireEvent.click(button);

    // Wait for async submit to complete
    await vi.waitFor(() => {
      expect(screen.getByText('Неверный токен')).toBeTruthy();
    });
  });

  it('button is disabled when input is empty', () => {
    render(TokenGate);
    const button = screen.getByRole('button', { name: /Войти/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('button shows "Проверка..." while checking', async () => {
    const { getPendingRequests } = await import('$lib/api/operator.js');
    // Make the promise never resolve so we stay in "checking" state
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.mocked(getPendingRequests).mockImplementation(() => new Promise(() => {}));

    render(TokenGate);
    const input = screen.getByPlaceholderText('Введите токен оператора');
    await fireEvent.input(input, { target: { value: 'test-token' } });
    const button = screen.getByRole('button', { name: /Войти/i });
    await fireEvent.click(button);

    // After click, button text should change to "Проверка..."
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /Проверка/i })).toBeTruthy();
    });
  });
});
