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
    txSignature: string;
    cluster?: string;
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
  class={cn(className)}
  style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;"
  title="Открыть в Solscan"
>
  {label}: {short} ↗
</a>
