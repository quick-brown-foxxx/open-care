<script lang="ts">
  import { formatUsdcAmount } from '$lib/utils/format-usdc-amount.js';
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';
  import TimelineEvent from './TimelineEvent.svelte';

  interface HeadInfo {
    head_hash: string;
    head_sequence_no: number;
  }

  interface TotalsInfo {
    balance_usdc_minor: string;
  }

  let {
    events,
    headInfo = null,
    totals = null,
  }: {
    events: LedgerEventItem[];
    headInfo?: HeadInfo | null;
    totals?: TotalsInfo | null;
  } = $props();

  const balanceDisplay = $derived(totals ? formatUsdcAmount(totals.balance_usdc_minor) : '—');
  const headHashShort = $derived(headInfo ? truncateHash(headInfo.head_hash) : '—');
  const headSeq = $derived(
    headInfo ? `#${String(headInfo.head_sequence_no).padStart(4, '0')}` : '—',
  );
</script>

<div class="rail-labels">
  <span></span>
  <div class="rail-mini">
    <span class="in">вход</span>
    <span class="out">карты</span>
    <span class="proof">доказательство</span>
    <span class="main">реестр</span>
  </div>
  <span>детали события</span>
</div>

{#each events as event (event.sequence_no)}
  <TimelineEvent {event} />
{/each}

<!-- Head row: current public state -->
<div class="event">
  <div class="date">
    <b>сейчас</b>
  </div>
  <div class="rail head">
    <span class="lane in"></span>
    <span class="lane out"></span>
    <span class="lane proof"></span>
    <span class="lane main"></span>
    <span class="merge"></span>
    <span class="node">H</span>
  </div>
  <article class="card">
    <div class="card-main">
      <div class="row-top">
        <span class="title">Текущее публичное состояние</span>
        <span class="amount anchor">{balanceDisplay} USDC</span>
      </div>
      <div class="meta">
        <span>HEAD <code>{headSeq}</code></span>
        <span>latest_hash <code>{headHashShort}</code></span>
      </div>
    </div>
  </article>
</div>
