<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    tabs,
    active,
    class: className = '',
    onchange,
  }: {
    /** Array of { key, label } for each tab. */
    tabs: Array<{ key: string; label: string }>;
    /** Currently active tab key. */
    active: string;
    class?: string;
    /** Called with the new tab key when a tab is clicked. */
    onchange?: (key: string) => void;
  } = $props();
</script>

<nav class={cn('filter-tabs', className)} role="tablist" aria-label="Фильтр событий">
  {#each tabs as tab (tab.key)}
    <button
      type="button"
      role="tab"
      aria-selected={active === tab.key}
      class="filter-tab"
      class:active={active === tab.key}
      onclick={() => onchange?.(tab.key)}
    >
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .filter-tabs {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }
  .filter-tab {
    padding: 0.375rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
  }
  .filter-tab:hover {
    background: #f3f4f6;
    color: var(--color-text);
  }
  .filter-tab.active {
    background: var(--color-primary);
    color: #ffffff;
  }
</style>
