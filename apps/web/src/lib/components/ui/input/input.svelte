<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    id,
    name,
    type = 'text',
    placeholder = '',
    value = '',
    disabled = false,
    required = false,
    autocomplete = undefined,
    class: className = '',
    oninput,
    onchange,
  }: {
    id?: string;
    name?: string;
    type?: 'text' | 'password' | 'number' | 'email' | 'url' | 'datetime-local';
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    required?: boolean;
    /** Use 'off' for sensitive fields (gift-card codes, tokens). */
    autocomplete?: string | undefined;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_autocomplete_valid -->
<input
  {id}
  {name}
  {type}
  {placeholder}
  {value}
  {disabled}
  {required}
  autocomplete={autocomplete as 'off' | undefined}
  class={cn('ui-input', className)}
  oninput={(e) => oninput?.(e)}
  onchange={(e) => onchange?.(e)}
/>

<style>
  .ui-input {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    transition: border-color 0.15s;
  }
  .ui-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }
  .ui-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f3f4f6;
  }
  .ui-input::placeholder {
    color: var(--color-text-muted);
  }
</style>
