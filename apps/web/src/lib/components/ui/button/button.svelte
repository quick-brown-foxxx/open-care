<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn.js';

  let {
    variant = 'secondary',
    size = 'md',
    href = undefined,
    type = 'button',
    disabled = false,
    onclick = undefined,
    class: className = '',
    children,
  }: {
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    href?: string | undefined;
    type?: 'button' | 'submit';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    class?: string;
    children: Snippet;
  } = $props();
</script>

{#if href}
  <a
    {href}
    role="button"
    class={cn(
      'btn',
      variant === 'primary' && 'primary',
      size === 'sm' && 'btn-sm',
      size === 'lg' && 'btn-lg',
      className,
    )}
  >
    {@render children()}
  </a>
{:else}
  <button
    {type}
    {disabled}
    {onclick}
    class={cn(
      'btn',
      variant === 'primary' && 'primary',
      size === 'sm' && 'btn-sm',
      size === 'lg' && 'btn-lg',
      className,
    )}
  >
    {@render children()}
  </button>
{/if}
