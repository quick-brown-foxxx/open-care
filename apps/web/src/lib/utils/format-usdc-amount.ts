/**
 * Formats a USDC minor-unit string for timeline display.
 * Returns whole USDC amounts with space thousand separators, no decimals.
 * "4350000000" → "4 350"
 * "250000000" → "250"
 * "0" or empty → "—"
 */
export function formatUsdcAmount(minorUnits: string): string {
  if (!minorUnits || minorUnits === '0') return '—';

  try {
    const bn = BigInt(minorUnits);
    if (bn <= 0n) return '—';

    // USDC has 6 decimals — divide by 10^6 for whole units
    const wholeUnits = bn / 1_000_000n;
    const remainder = bn % 1_000_000n;

    // If there's a fractional part, include 2 decimal places
    if (remainder > 0n) {
      const fracStr = remainder.toString().padStart(6, '0').slice(0, 2);
      const intStr = wholeUnits.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return `${intStr}.${fracStr}`;
    }

    // Whole number — space-separated thousands
    return wholeUnits.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } catch {
    return '—';
  }
}
