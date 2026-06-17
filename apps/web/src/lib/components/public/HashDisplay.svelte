<script lang="ts">
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import { cn } from '$lib/utils/cn.js';

  let {
    hash,
    label,
    full = false,
    class: className = '',
  }: {
    /** 64-char hex hash to display. */
    hash: string;
    /** Optional label (e.g. "HEAD", "event_hash"). */
    label?: string;
    /** Show full hash instead of truncated. */
    full?: boolean;
    class?: string;
  } = $props();

  const display = $derived(full ? hash : truncateHash(hash));
</script>

<span class={cn('hash-display', className)}>
  {#if label}
    <span class="hash-label">{label}:</span>
  {/if}
  <code class="hash-value" title={hash}>{display}</code>
</span>

<style>
  .hash-display {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.85rem;
  }
  .hash-label {
    color: var(--color-text-muted);
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }
  .hash-value {
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
    font-size: 0.8rem;
    color: var(--color-text);
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    word-break: break-all;
  }
</style>
