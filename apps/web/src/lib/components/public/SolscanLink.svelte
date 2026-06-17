<script lang="ts">
  import { formatSolscanUrl } from '$lib/utils/format-solscan-url.js';
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import { cn } from '$lib/utils/cn.js';

  let {
    txSignature,
    cluster = 'mainnet-beta',
    label = 'tx',
    class: className = '',
  }: {
    /** Base58 Solana transaction signature. */
    txSignature: string;
    /** Solana cluster (default mainnet-beta). */
    cluster?: string;
    /** Link label (default "tx"). */
    label?: string;
    class?: string;
  } = $props();

  const url = $derived(formatSolscanUrl(txSignature, cluster));
  const short = $derived(truncateHash(txSignature));
</script>

<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  class={cn('solscan-link', className)}
  title="Открыть в Solscan"
>
  {label}: {short} ↗
</a>

<style>
  .solscan-link {
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
    font-size: 0.8rem;
    color: var(--color-primary);
    text-decoration: none;
    white-space: nowrap;
  }
  .solscan-link:hover {
    text-decoration: underline;
  }
</style>
