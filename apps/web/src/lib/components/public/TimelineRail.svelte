<script lang="ts">
  import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

  let { event }: { event: LedgerEventItem } = $props();

  const railClass = $derived(getRailClass(event.event_type));
  const nodeSymbol = $derived(getNodeSymbol(event.event_type));

  function getRailClass(eventType: string): string {
    switch (eventType) {
      case 'donation_confirmed':
        return 'in';
      case 'disbursement_recorded':
        return 'out';
      case 'anchor_published':
        return 'anchor';
      case 'correction_recorded':
        return 'system';
      default:
        return 'system';
    }
  }

  function getNodeSymbol(eventType: string): string {
    switch (eventType) {
      case 'donation_confirmed':
        return '+';
      case 'disbursement_recorded':
        return '\u2212'; // minus sign
      case 'anchor_published':
        return '#';
      case 'correction_recorded':
        return '\u25C7'; // ◇
      default:
        return '\u25C7';
    }
  }
</script>

<div class="rail {railClass}">
  <span class="lane in"></span>
  <span class="lane out"></span>
  <span class="lane proof"></span>
  <span class="lane main"></span>
  <span class="merge"></span>
  <span class="node">{nodeSymbol}</span>
</div>
