<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn.js';

  let {
    value = '',
    disabled = false,
    onchange = undefined,
    class: className = '',
    children,
  }: {
    value?: string;
    disabled?: boolean;
    onchange?: (e: Event) => void;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<select {value} {disabled} class={cn('form-select', className)} onchange={(e) => onchange?.(e)}>
  {@render children()}
</select>
