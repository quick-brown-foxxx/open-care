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

  const eventTypeVariant: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'default'> = {
    donation_confirmed: 'green',
    disbursement_recorded: 'amber',
    anchor_published: 'blue',
    correction_recorded: 'purple',
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

<div class={cn('standalone-card', className)} style="padding: 12px 16px;">
  <div
    style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.375rem;"
  >
    <Badge {variant}>{label}</Badge>
    <span
      style="font-size: 0.75rem; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
      >#{event.sequence_no}</span
    >
  </div>
  <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.375rem;">
    {#if payloadAmount}
      <span style="font-weight: 600; font-size: 0.95rem; color: var(--green);">{payloadAmount}</span
      >
    {/if}
    <span style="font-size: 0.8rem; color: var(--muted);">{formatDate(event.created_at_utc)}</span>
  </div>
  <div>
    <code title={event.event_hash}>{shortHash}</code>
  </div>
</div>
