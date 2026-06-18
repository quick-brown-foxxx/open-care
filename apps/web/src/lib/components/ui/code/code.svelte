<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn.js';

  let {
    class: className = '',
    children,
  }: {
    class?: string;
    children: Snippet;
  } = $props();
</script>

<code class={cn(className)}>
  {@render children()}
</code>
