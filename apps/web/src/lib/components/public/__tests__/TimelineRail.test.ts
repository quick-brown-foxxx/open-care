import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import TimelineRail from '../TimelineRail.svelte';
import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

afterEach(() => cleanup());

function makeEvent(eventType: LedgerEventItem['event_type']): LedgerEventItem {
  return {
    sequence_no: 1,
    event_type: eventType,
    payload_json: '{}',
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    event_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    created_at_utc: '2025-06-01T09:10:00Z',
  };
}

describe('TimelineRail', () => {
  it('renders rail with class "in" for donation_confirmed', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('donation_confirmed') },
    });
    const rail = container.querySelector('.rail');
    expect(rail).toBeTruthy();
    expect(rail?.classList.contains('in')).toBe(true);
  });

  it('renders rail with class "out" for disbursement_recorded', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('disbursement_recorded') },
    });
    const rail = container.querySelector('.rail');
    expect(rail?.classList.contains('out')).toBe(true);
  });

  it('renders rail with class "anchor" for anchor_published', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('anchor_published') },
    });
    const rail = container.querySelector('.rail');
    expect(rail?.classList.contains('anchor')).toBe(true);
  });

  it('renders rail with class "system" for correction_recorded', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('correction_recorded') },
    });
    const rail = container.querySelector('.rail');
    expect(rail?.classList.contains('system')).toBe(true);
  });

  it('shows "+" node symbol for donation_confirmed', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('donation_confirmed') },
    });
    const node = container.querySelector('.node');
    expect(node?.textContent).toBe('+');
  });

  it('shows "−" node symbol for disbursement_recorded', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('disbursement_recorded') },
    });
    const node = container.querySelector('.node');
    expect(node?.textContent).toBe('\u2212');
  });

  it('shows "#" node symbol for anchor_published', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('anchor_published') },
    });
    const node = container.querySelector('.node');
    expect(node?.textContent).toBe('#');
  });

  it('shows "◇" node symbol for correction_recorded', () => {
    const { container } = render(TimelineRail, {
      props: { event: makeEvent('correction_recorded') },
    });
    const node = container.querySelector('.node');
    expect(node?.textContent).toBe('\u25C7');
  });
});
