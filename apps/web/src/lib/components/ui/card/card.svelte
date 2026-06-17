<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    class: className = '',
    children,
  }: {
    class?: string;
    children: import('svelte').Snippet;
  } = $props();
</script>

<div class={cn('ui-card', className)}>
  {@render children()}
</div>

<style>
  .ui-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 1.25rem;
  }
</style>
