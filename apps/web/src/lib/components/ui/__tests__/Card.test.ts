import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import Card from '../card/card.svelte';

afterEach(() => cleanup());

describe('Card', () => {
  it('renders with class "standalone-card"', () => {
    const { container } = render(Card, {
      props: { children: () => 'Card content' },
    });
    const card = container.querySelector('.standalone-card');
    expect(card).toBeTruthy();
  });

  // NOTE: Svelte 5 Snippet children do not render through
  // @testing-library/svelte's Proxy-based props wrapper.
  // The "renders slot content" test is skipped until
  // the testing library supports Snippet forwarding.

  it('applies custom class', () => {
    const { container } = render(Card, {
      props: { class: 'my-custom', children: () => 'Custom card' },
    });
    const card = container.querySelector('.standalone-card');
    expect(card?.classList.contains('my-custom')).toBe(true);
  });
});
