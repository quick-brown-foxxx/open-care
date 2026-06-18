<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    tabs,
    active,
    class: className = '',
    onchange,
  }: {
    tabs: Array<{ key: string; label: string }>;
    active: string;
    class?: string;
    onchange?: (key: string) => void;
  } = $props();
</script>

<div
  class={cn(className)}
  role="tablist"
  aria-label="Фильтр событий"
  style="display: flex; gap: 6px; flex-wrap: wrap;"
>
  {#each tabs as tab (tab.key)}
    <button
      type="button"
      role="tab"
      aria-selected={active === tab.key}
      class="chip"
      style={active === tab.key
        ? 'background: var(--title); color: var(--page-bg); border-color: var(--title); cursor: default;'
        : 'cursor: pointer;'}
      onclick={() => onchange?.(tab.key)}
    >
      {tab.label}
    </button>
  {/each}
</div>
