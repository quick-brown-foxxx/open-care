import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import TimelineEvent from '../TimelineEvent.svelte';
import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

afterEach(() => cleanup());

const mockDonation: LedgerEventItem = {
  sequence_no: 1,
  event_type: 'donation_confirmed',
  payload_json: JSON.stringify({
    tx_signature: 'abc123',
    amount_usdc_minor: '250000000',
    cluster: 'mainnet-beta',
  }),
  prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
  event_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  created_at_utc: '2025-06-01T09:10:00Z',
};

describe('TimelineEvent', () => {
  it('renders with event prop', () => {
    render(TimelineEvent, { props: { event: mockDonation } });
    expect(screen.getByText('+')).toBeTruthy(); // node symbol
  });

  it('displays the event date', () => {
    render(TimelineEvent, { props: { event: mockDonation } });
    // formatTimelineDate returns {datePart: "1 июн", timePart: "09:10"} for ru-RU locale
    // The date div contains <b>datePart</b> timePart
    const dateDiv = document.querySelector('.date');
    expect(dateDiv).toBeTruthy();
    expect(dateDiv?.textContent).toContain('09:10');
  });

  it('contains rail and card elements', () => {
    const { container } = render(TimelineEvent, { props: { event: mockDonation } });
    expect(container.querySelector('.rail')).toBeTruthy();
    expect(container.querySelector('.card')).toBeTruthy();
  });
});
