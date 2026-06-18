import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import Badge from '../badge/badge.svelte';

afterEach(() => cleanup());

describe('Badge', () => {
  it('renders with class "chip"', () => {
    const { container } = render(Badge, {
      props: { children: () => 'Badge text' },
    });
    const chip = container.querySelector('.chip');
    expect(chip).toBeTruthy();
  });

  it('renders with default variant color', () => {
    const { container } = render(Badge, {
      props: { children: () => 'Default' },
    });
    const chip = container.querySelector('.chip') as HTMLElement;
    expect(chip.style.color).toBe('var(--muted)');
  });

  it('renders with green variant color', () => {
    const { container } = render(Badge, {
      props: { variant: 'green', children: () => 'Green' },
    });
    const chip = container.querySelector('.chip') as HTMLElement;
    expect(chip.style.color).toBe('rgb(79, 157, 105)');
  });

  it('renders with amber variant color', () => {
    const { container } = render(Badge, {
      props: { variant: 'amber', children: () => 'Amber' },
    });
    const chip = container.querySelector('.chip') as HTMLElement;
    expect(chip.style.color).toBe('rgb(217, 129, 81)');
  });

  it('renders with blue variant color', () => {
    const { container } = render(Badge, {
      props: { variant: 'blue', children: () => 'Blue' },
    });
    const chip = container.querySelector('.chip') as HTMLElement;
    expect(chip.style.color).toBe('rgb(111, 130, 214)');
  });

  it('renders with purple variant color', () => {
    const { container } = render(Badge, {
      props: { variant: 'purple', children: () => 'Purple' },
    });
    const chip = container.querySelector('.chip') as HTMLElement;
    expect(chip.style.color).toBe('rgb(185, 130, 199)');
  });

  // NOTE: Svelte 5 Snippet children do not render through
  // @testing-library/svelte's Proxy-based props wrapper.
  // The "renders slot content" test is skipped until
  // the testing library supports Snippet forwarding.
});
