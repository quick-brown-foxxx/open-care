import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import TimelineCard from '../TimelineCard.svelte';
import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

afterEach(() => cleanup());

function makeEvent(
  eventType: LedgerEventItem['event_type'],
  payload: Record<string, unknown>,
): LedgerEventItem {
  return {
    sequence_no: 1,
    event_type: eventType,
    payload_json: JSON.stringify(payload),
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    event_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    created_at_utc: '2025-06-01T09:10:00Z',
  };
}

describe('TimelineCard', () => {
  describe('donation_confirmed', () => {
    it('renders "Анонимное пожертвование" title', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('donation_confirmed', {
            tx_signature: 'abc123',
            amount_usdc_minor: '250000000',
            cluster: 'mainnet-beta',
          }),
        },
      });
      expect(screen.getByText('Анонимное пожертвование')).toBeTruthy();
    });

    it('renders "+...USDC" amount', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('donation_confirmed', {
            tx_signature: 'abc123',
            amount_usdc_minor: '250000000',
            cluster: 'mainnet-beta',
          }),
        },
      });
      // formatUsdcAmount("250000000") → "250"
      expect(screen.getByText('+250 USDC')).toBeTruthy();
    });

    it('renders tx signature link', () => {
      const { container } = render(TimelineCard, {
        props: {
          event: makeEvent('donation_confirmed', {
            tx_signature: 'abc123def456',
            amount_usdc_minor: '250000000',
            cluster: 'mainnet-beta',
          }),
        },
      });
      const links = container.querySelectorAll('a');
      const solscanLink = Array.from(links).find((a) =>
        a.getAttribute('href')?.includes('solscan.io'),
      );
      expect(solscanLink).toBeTruthy();
    });
  });

  describe('disbursement_recorded', () => {
    it('renders service name and gift card count', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('disbursement_recorded', {
            amount_usdc_minor: '100000000',
            gift_card_count: 5,
            service: 'Пятёрочка',
            receipt_ref: 'receipt-001',
            public_beneficiary_ref: null,
          }),
        },
      });
      // Title: "Куплены подарочные карты Пятёрочка ×5"
      expect(screen.getByText(/Куплены подарочные карты/)).toBeTruthy();
      expect(screen.getByText(/Пятёрочка/)).toBeTruthy();
    });

    it('renders "−...USDC" amount', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('disbursement_recorded', {
            amount_usdc_minor: '100000000',
            gift_card_count: 5,
            service: 'Пятёрочка',
            receipt_ref: 'receipt-001',
            public_beneficiary_ref: null,
          }),
        },
      });
      // formatUsdcAmount("100000000") → "100"
      // The component uses &minus; HTML entity
      const amountEl = document.querySelector('.amount.out');
      expect(amountEl).toBeTruthy();
      expect(amountEl?.textContent).toContain('100 USDC');
    });

    it('renders receipt_ref', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('disbursement_recorded', {
            amount_usdc_minor: '100000000',
            gift_card_count: 5,
            service: 'Пятёрочка',
            receipt_ref: 'receipt-001',
            public_beneficiary_ref: null,
          }),
        },
      });
      expect(screen.getByText('receipt-001')).toBeTruthy();
    });

    it('renders chips', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('disbursement_recorded', {
            amount_usdc_minor: '100000000',
            gift_card_count: 5,
            service: 'Пятёрочка',
            receipt_ref: 'receipt-001',
            public_beneficiary_ref: null,
          }),
        },
      });
      expect(screen.getByText('без имён получателей')).toBeTruthy();
      expect(screen.getByText('чек опубликован')).toBeTruthy();
    });

    it('renders public_beneficiary_ref when present', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('disbursement_recorded', {
            amount_usdc_minor: '100000000',
            gift_card_count: 5,
            service: 'Пятёрочка',
            receipt_ref: 'receipt-001',
            public_beneficiary_ref: 'ben-123',
          }),
        },
      });
      expect(screen.getByText('ben-123')).toBeTruthy();
    });
  });

  describe('anchor_published', () => {
    it('renders "Хэш реестра закреплён в Solana" title', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('anchor_published', {
            tx_signature: 'sig123',
            anchored_head_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            cluster: 'mainnet-beta',
          }),
        },
      });
      expect(screen.getByText('Хэш реестра закреплён в Solana')).toBeTruthy();
    });

    it('renders "ok" amount', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('anchor_published', {
            tx_signature: 'sig123',
            anchored_head_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            cluster: 'mainnet-beta',
          }),
        },
      });
      expect(screen.getByText('ok')).toBeTruthy();
    });

    it('renders tx signature link', () => {
      const { container } = render(TimelineCard, {
        props: {
          event: makeEvent('anchor_published', {
            tx_signature: 'sig123',
            anchored_head_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            cluster: 'mainnet-beta',
          }),
        },
      });
      const links = container.querySelectorAll('a');
      const solscanLink = Array.from(links).find((a) =>
        a.getAttribute('href')?.includes('solscan.io'),
      );
      expect(solscanLink).toBeTruthy();
    });
  });

  describe('correction_recorded', () => {
    it('renders "Коррекция #N" title', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('correction_recorded', {
            corrects_sequence_no: 42,
            reason: 'Ошибка в сумме',
            replacement_fields: { amount_usdc_minor: '300000000' },
          }),
        },
      });
      expect(screen.getByText('Коррекция #42')).toBeTruthy();
    });

    it('renders reason text', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('correction_recorded', {
            corrects_sequence_no: 42,
            reason: 'Ошибка в сумме',
            replacement_fields: { amount_usdc_minor: '300000000' },
          }),
        },
      });
      expect(screen.getByText('Ошибка в сумме')).toBeTruthy();
    });
  });

  describe('unknown event type', () => {
    it('renders "Событие #N" title for unknown type', () => {
      render(TimelineCard, {
        props: {
          event: makeEvent('unknown_type' as LedgerEventItem['event_type'], {}),
        },
      });
      expect(screen.getByText('Событие #1')).toBeTruthy();
    });
  });
});
