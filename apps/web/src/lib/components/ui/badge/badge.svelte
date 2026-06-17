<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    variant = 'default',
    class: className = '',
    children,
  }: {
    variant?: 'default' | 'accent' | 'danger' | 'muted';
    class?: string;
    children: import('svelte').Snippet;
  } = $props();

  const variantClasses: Record<string, string> = {
    default: 'badge-default',
    accent: 'badge-accent',
    danger: 'badge-danger',
    muted: 'badge-muted',
  };
</script>

<span class={cn('badge', variantClasses[variant], className)}>
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.4;
    border-radius: 9999px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
  .badge-default {
    background: #e5e7eb;
    color: #374151;
  }
  .badge-accent {
    background: #d1fae5;
    color: #065f46;
  }
  .badge-danger {
    background: #fee2e2;
    color: #991b1b;
  }
  .badge-muted {
    background: #f3f4f6;
    color: #6b7280;
  }
</style>
