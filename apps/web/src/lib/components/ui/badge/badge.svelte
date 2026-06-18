<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn.js';

  let {
    variant = 'default',
    class: className = '',
    children,
  }: {
    variant?: 'default' | 'green' | 'amber' | 'blue' | 'purple';
    class?: string;
    children: Snippet;
  } = $props();

  const variantColors: Record<string, string> = {
    default: 'var(--muted)',
    green: '#4f9d69',
    amber: '#d98151',
    blue: '#6f82d6',
    purple: '#b982c7',
  };
</script>

<span class={cn('chip', className)} style="color: {variantColors[variant]}">
  {@render children()}
</span>
