<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    hasMore,
    loading = false,
    class: className = '',
    onload,
  }: {
    /** Whether more items are available. */
    hasMore: boolean;
    /** Whether a load is in progress. */
    loading?: boolean;
    class?: string;
    /** Called when the user clicks "Load more". */
    onload?: () => void;
  } = $props();
</script>

{#if hasMore}
  <div class={cn('pagination', className)}>
    <Button variant="outline" size="sm" disabled={loading} onclick={() => onload?.()}>
      {loading ? 'Загрузка...' : 'Загрузить ещё'}
    </Button>
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    justify-content: center;
    padding: 1.5rem 0;
  }
</style>
