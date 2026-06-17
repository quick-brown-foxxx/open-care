<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { formatDate } from '$lib/utils/format-date.js';
  import { formatUsdc } from '$lib/utils/format-usdc.js';
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

  let {
    event,
    class: className = '',
  }: {
    event: LedgerEventItem;
    class?: string;
  } = $props();

  const eventTypeLabel: Record<string, string> = {
    donation_confirmed: 'Пожертвование',
    disbursement_recorded: 'Выплата',
    anchor_published: 'Якорь',
    correction_recorded: 'Коррекция',
  };

  const eventTypeVariant: Record<string, 'accent' | 'default' | 'muted'> = {
    donation_confirmed: 'accent',
    disbursement_recorded: 'default',
    anchor_published: 'default',
    correction_recorded: 'muted',
  };

  const label = $derived(eventTypeLabel[event.event_type] ?? event.event_type);
  const variant = $derived(eventTypeVariant[event.event_type] ?? 'default');
  const shortHash = $derived(truncateHash(event.event_hash));

  let payloadAmount: string | null = $derived.by(() => {
    try {
      const p = JSON.parse(event.payload_json) as Record<string, unknown>;
      if (typeof p.amount_usdc_minor === 'string') return formatUsdc(p.amount_usdc_minor);
      return null;
    } catch {
      return null;
    }
  });
</script>

<div class={cn('event-card', className)}>
  <div class="event-header">
    <Badge {variant}>{label}</Badge>
    <span class="event-seq">#{event.sequence_no}</span>
  </div>
  <div class="event-body">
    {#if payloadAmount}
      <span class="event-amount">{payloadAmount}</span>
    {/if}
    <span class="event-time">{formatDate(event.created_at_utc)}</span>
  </div>
  <div class="event-footer">
    <code class="event-hash" title={event.event_hash}>{shortHash}</code>
  </div>
</div>

<style>
  .event-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    transition: background 0.15s;
  }
  .event-card:hover {
    background: #f9fafb;
  }
  .event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.375rem;
  }
  .event-seq {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
  }
  .event-body {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.375rem;
  }
  .event-amount {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-accent);
  }
  .event-time {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .event-footer {
    font-size: 0.75rem;
  }
  .event-hash {
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
    color: var(--color-text-muted);
  }
</style>
