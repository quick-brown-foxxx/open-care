import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import CopyButton from '../CopyButton.svelte';

afterEach(() => cleanup());

describe('CopyButton', () => {
  it('renders a button with default label "Скопировать"', () => {
    render(CopyButton, { props: { text: 'test-hash' } });
    expect(screen.getByRole('button', { name: /Скопировать/i })).toBeTruthy();
  });

  it('shows custom label', () => {
    render(CopyButton, {
      props: { text: 'test-hash', label: 'Копировать хэш' },
    });
    expect(screen.getByRole('button', { name: /Копировать хэш/i })).toBeTruthy();
  });

  it('copies text to clipboard on click', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText: writeTextMock },
    });

    render(CopyButton, { props: { text: 'copy-me' } });
    const btn = screen.getByRole('button', { name: /Скопировать/i });
    await fireEvent.click(btn);

    expect(writeTextMock).toHaveBeenCalledWith('copy-me');
  });

  it('shows "✓ Скопировано" after copy', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText: writeTextMock },
    });

    render(CopyButton, { props: { text: 'copy-me' } });
    const btn = screen.getByRole('button', { name: /Скопировать/i });
    await fireEvent.click(btn);

    expect(screen.getByText('✓ Скопировано')).toBeTruthy();
  });

  it('has aria-label attribute', () => {
    render(CopyButton, { props: { text: 'test-hash' } });
    const btn = screen.getByRole('button', { name: /Скопировать/i });
    expect(btn.getAttribute('aria-label')).toBe('Скопировать');
  });
});
