<script lang="ts">
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import { cn } from '$lib/utils/cn.js';

  let {
    hash,
    label,
    full = false,
    class: className = '',
  }: {
    hash: string;
    label?: string;
    full?: boolean;
    class?: string;
  } = $props();

  const display = $derived(full ? hash : truncateHash(hash));
</script>

<span class={cn(className)} style="display: inline-flex; align-items: center; gap: 0.375rem;">
  {#if label}
    <span class="text-muted">{label}:</span>
  {/if}
  <code title={hash}>{display}</code>
</span>
