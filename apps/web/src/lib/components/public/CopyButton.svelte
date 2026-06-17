<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    text,
    label = 'Скопировать',
    class: className = '',
  }: {
    /** Text to copy to clipboard. */
    text: string;
    /** Accessible label for the button. */
    label?: string;
    class?: string;
  } = $props();

  let copied = $state(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard API not available — silently fail
    }
  }
</script>

<button type="button" class={cn('copy-btn', className)} onclick={handleCopy} aria-label={label}>
  {#if copied}
    <span class="copy-icon">✓</span> Скопировано
  {:else}
    <span class="copy-icon">📋</span> {label}
  {/if}
</button>

<style>
  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
  }
  .copy-btn:hover {
    background: #f3f4f6;
    color: var(--color-text);
  }
  .copy-icon {
    font-size: 0.85rem;
  }
</style>
