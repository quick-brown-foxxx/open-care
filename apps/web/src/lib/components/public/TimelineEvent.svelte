<script lang="ts">
  import { formatTimelineDate } from '$lib/utils/format-timeline-date.js';
  import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';
  import TimelineRail from './TimelineRail.svelte';
  import TimelineCard from './TimelineCard.svelte';

  let { event }: { event: LedgerEventItem } = $props();

  const { datePart, timePart } = $derived(formatTimelineDate(event.created_at_utc));
</script>

<div class="event">
  <div class="date">
    <b>{datePart}</b>
    {timePart}
  </div>
  <TimelineRail {event} />
  <TimelineCard {event} />
</div>
