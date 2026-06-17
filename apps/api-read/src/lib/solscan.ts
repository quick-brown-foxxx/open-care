/**
 * Build a Solscan transaction URL for the given signature and cluster.
 *
 * Mainnet: https://solscan.io/tx/<sig>
 * Devnet:  https://solscan.io/tx/<sig>?cluster=devnet
 */
export function solscanTxUrl(txSignature: string, cluster: string): string {
  const base = `https://solscan.io/tx/${txSignature}`;
  if (cluster === 'devnet') {
    return `${base}?cluster=devnet`;
  }
  return base;
}
