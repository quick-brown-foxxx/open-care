<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    id,
    name,
    value = '',
    disabled = false,
    required = false,
    class: className = '',
    onchange,
    children,
  }: {
    id?: string;
    name?: string;
    value?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    onchange?: (e: Event) => void;
    children: import('svelte').Snippet;
  } = $props();
</script>

<select
  {id}
  {name}
  {value}
  {disabled}
  {required}
  class={cn('ui-select', className)}
  onchange={(e) => onchange?.(e)}
>
  {@render children()}
</select>

<style>
  .ui-select {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    padding-right: 2rem;
    transition: border-color 0.15s;
  }
  .ui-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }
  .ui-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f3f4f6;
  }
</style>
