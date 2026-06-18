import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import SolscanLink from '../SolscanLink.svelte';

afterEach(() => cleanup());

const TX_SIG = '5nLqk4mKxQqG3pN2rM8sT1vW7yZ6aB9cD0eF1gH2iJ3kL4mN5oP6qR7sT8uV9wX0';

describe('SolscanLink', () => {
  it('builds correct URL for mainnet-beta', () => {
    const { container } = render(SolscanLink, {
      props: { txSignature: TX_SIG },
    });
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe(`https://solscan.io/tx/${TX_SIG}`);
  });

  it('builds correct URL for devnet', () => {
    const { container } = render(SolscanLink, {
      props: { txSignature: TX_SIG, cluster: 'devnet' },
    });
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe(`https://solscan.io/tx/${TX_SIG}?cluster=devnet`);
  });

  it('shows custom label', () => {
    render(SolscanLink, {
      props: { txSignature: TX_SIG, label: 'anchor tx' },
    });
    // The link text is "anchor tx: <short> ↗"
    expect(screen.getByText(/anchor tx:/)).toBeTruthy();
  });

  it('has target="_blank" and rel="noopener noreferrer"', () => {
    const { container } = render(SolscanLink, {
      props: { txSignature: TX_SIG },
    });
    const link = container.querySelector('a');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows truncated tx signature', () => {
    render(SolscanLink, { props: { txSignature: TX_SIG } });
    // truncateHash returns first 4 + "..." + last 4
    const short = TX_SIG.slice(0, 4) + '...' + TX_SIG.slice(-4);
    expect(screen.getByText(new RegExp(short.replace(/\./g, '\\.')))).toBeTruthy();
  });
});
