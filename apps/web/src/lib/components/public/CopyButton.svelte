<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    text,
    label = 'Скопировать',
    class: className = '',
  }: {
    text: string;
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

<button
  type="button"
  class={cn('btn', 'btn-sm', className)}
  onclick={handleCopy}
  aria-label={label}
>
  {#if copied}
    ✓ Скопировано
  {:else}
    {label}
  {/if}
</button>
