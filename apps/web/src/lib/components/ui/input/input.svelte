<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    type = 'text',
    placeholder = '',
    value = '',
    disabled = false,
    autocomplete = undefined,
    oninput = undefined,
    class: className = '',
  }: {
    type?: string;
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    autocomplete?: string | undefined;
    oninput?: (e: Event) => void;
    class?: string;
  } = $props();
</script>

<input
  {type}
  {placeholder}
  {value}
  {disabled}
  autocomplete={autocomplete as any}
  class={cn('form-input', className)}
  oninput={(e) => oninput?.(e)}
/>
