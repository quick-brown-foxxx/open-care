import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import HashDisplay from '../HashDisplay.svelte';

afterEach(() => cleanup());

const LONG_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('HashDisplay', () => {
  it('truncates a 64-char hash (shows first 4 + "..." + last 4)', () => {
    render(HashDisplay, { props: { hash: LONG_HASH } });
    const code = document.querySelector('code');
    expect(code?.textContent).toBe('aaaa...aaaa');
  });

  it('shows full hash when full=true', () => {
    render(HashDisplay, { props: { hash: LONG_HASH, full: true } });
    const code = document.querySelector('code');
    expect(code?.textContent).toBe(LONG_HASH);
  });

  it('shows label when provided', () => {
    render(HashDisplay, {
      props: { hash: LONG_HASH, label: 'sha256' },
    });
    expect(screen.getByText('sha256:')).toBeTruthy();
  });

  it('has title attribute with full hash', () => {
    render(HashDisplay, { props: { hash: LONG_HASH } });
    const code = document.querySelector('code');
    expect(code?.getAttribute('title')).toBe(LONG_HASH);
  });

  it('does not show label when not provided', () => {
    const { container } = render(HashDisplay, { props: { hash: LONG_HASH } });
    const textMuted = container.querySelector('.text-muted');
    expect(textMuted).toBeNull();
  });
});
