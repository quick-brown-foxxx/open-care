<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    hasMore,
    loading = false,
    class: className = '',
    onload,
  }: {
    hasMore: boolean;
    loading?: boolean;
    class?: string;
    onload?: () => void;
  } = $props();
</script>

{#if hasMore}
  <div class={cn(className)} style="display: flex; justify-content: center; padding: 1.5rem 0;">
    <button type="button" class="btn" disabled={loading} onclick={() => onload?.()}>
      {loading ? 'Загрузка...' : 'Загрузить ещё'}
    </button>
  </div>
{/if}
