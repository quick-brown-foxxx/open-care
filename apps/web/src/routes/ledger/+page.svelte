<script lang="ts">
  import { resolve } from '$app/paths';
  import { getLedgerEvents, getVerify, getBaseUrl } from '$lib/api/client.js';
  import { createFetch } from '$lib/state/api.svelte.js';
  import { formatUsdc } from '$lib/utils/format-usdc.js';
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import HashDisplay from '$lib/components/public/HashDisplay.svelte';
  import SolscanLink from '$lib/components/public/SolscanLink.svelte';
  import FilterTabs from '$lib/components/public/FilterTabs.svelte';
  import Pagination from '$lib/components/public/Pagination.svelte';
  import type { LedgerEventItem, LedgerEventsResponse } from '$lib/schemas/ledger-events.js';

  const headInfo = createFetch(getVerify);
  const ledger = createFetch(() => getLedgerEvents({ limit: 50 }));

  let activeFilter = $state('all');
  let allItems = $state<LedgerEventItem[]>([]);
  let nextCursor = $state<number | null>(null);
  let loadingMore = $state(false);

  const tabs = [
    { key: 'all', label: 'Все' },
    { key: 'donation_confirmed', label: 'Пожертвования' },
    { key: 'disbursement_recorded', label: 'Выплаты' },
    { key: 'anchor_published', label: 'Якоря' },
    { key: 'correction_recorded', label: 'Коррекции' },
  ];

  const eventTypeLabel: Record<string, string> = {
    donation_confirmed: 'Пожертвование',
    disbursement_recorded: 'Выплата',
    anchor_published: 'Якорь',
    correction_recorded: 'Коррекция',
  };

  const filteredItems = $derived(
    activeFilter === 'all' ? allItems : allItems.filter((e) => e.event_type === activeFilter),
  );

  // -----------------------------------------------------------------------
  // Timeline helpers
  // -----------------------------------------------------------------------

  const MONTHS = [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ];

  function formatTimelineDate(iso: string): { dayMonth: string; time: string } {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return { dayMonth: '—', time: '' };
      const day = d.getUTCDate();
      const month = MONTHS[d.getUTCMonth()];
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const minutes = d.getUTCMinutes().toString().padStart(2, '0');
      return { dayMonth: `${day} ${month}`, time: `${hours}:${minutes}` };
    } catch {
      return { dayMonth: '—', time: '' };
    }
  }

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
        return '−';
      case 'anchor_published':
        return '#';
      case 'correction_recorded':
        return '◇';
      default:
        return '◇';
    }
  }

  function getAmountClass(eventType: string): string {
    switch (eventType) {
      case 'donation_confirmed':
        return 'in';
      case 'disbursement_recorded':
        return 'out';
      case 'anchor_published':
        return 'anchor';
      default:
        return '';
    }
  }

  function getPayloadAmount(item: LedgerEventItem): string | null {
    try {
      const p = JSON.parse(item.payload_json) as Record<string, unknown>;
      if (typeof p.amount_usdc_minor === 'string') return formatUsdc(p.amount_usdc_minor);
      return null;
    } catch {
      return null;
    }
  }

  function getTxSignature(payloadJson: string): string | null {
    try {
      const p = JSON.parse(payloadJson) as Record<string, unknown>;
      if (typeof p.tx_signature === 'string') return p.tx_signature;
      return null;
    } catch {
      return null;
    }
  }

  function getEventTitle(item: LedgerEventItem): string {
    try {
      const p = JSON.parse(item.payload_json) as Record<string, unknown>;
      switch (item.event_type) {
        case 'donation_confirmed': {
          const wallet =
            typeof p.wallet_name === 'string'
              ? p.wallet_name
              : typeof p.from_address === 'string'
                ? truncateHash(p.from_address as string)
                : null;
          return wallet ? `Пожертвование · ${wallet}` : 'Анонимное пожертвование';
        }
        case 'disbursement_recorded': {
          const provider = typeof p.provider === 'string' ? p.provider : null;
          const count = typeof p.card_count === 'number' ? ` ×${p.card_count}` : '';
          return provider ? `Выплата · ${provider}${count}` : 'Выплата';
        }
        case 'anchor_published':
          return 'Хэш реестра закреплён в Solana';
        case 'correction_recorded': {
          const reason = typeof p.reason === 'string' ? p.reason : null;
          return reason ? `Коррекция: ${reason}` : 'Коррекция';
        }
        default:
          return eventTypeLabel[item.event_type] ?? item.event_type;
      }
    } catch {
      return eventTypeLabel[item.event_type] ?? item.event_type;
    }
  }

  // -----------------------------------------------------------------------
  // Data sync & pagination
  // -----------------------------------------------------------------------

  $effect(() => {
    if (ledger.data) {
      allItems = ledger.data.items;
      nextCursor = ledger.data.next_after_sequence_no;
    }
  });

  async function loadMore(): Promise<void> {
    if (nextCursor === null || loadingMore) return;
    loadingMore = true;
    const result = await getLedgerEvents({ limit: 50, after_sequence_no: nextCursor });
    if (result.ok) {
      allItems = [...allItems, ...result.value.items];
      nextCursor = result.value.next_after_sequence_no;
    }
    loadingMore = false;
  }
</script>

<svelte:head>
  <title>Реестр — Open Care</title>
</svelte:head>

<section class="ledger-page">
  <h1>Реестр</h1>
  <p class="lead">
    Публичный реестр всех событий платформы. Каждое событие криптографически связано с предыдущим,
    образуя непрерывную и проверяемую цепочку.
  </p>

  <!-- Head info -->
  {#if headInfo.data}
    <div class="standalone-card head-info">
      <HashDisplay hash={headInfo.data.head_hash} label="HEAD" full={true} />
      <span class="text-muted head-seq">#{headInfo.data.head_sequence_no}</span>
    </div>
  {/if}

  <!-- Export link -->
  <p class="export-row">
    <a href="{getBaseUrl()}/api/ledger-events" class="btn btn-sm">Экспорт JSON (API) ↗</a>
  </p>

  <!-- Filters -->
  <FilterTabs {tabs} active={activeFilter} onchange={(k) => (activeFilter = k)} />

  <!-- Events -->
  {#if ledger.loading}
    <p class="text-muted">Загрузка...</p>
  {:else if ledger.error}
    <div class="standalone-card">
      <p>
        Не удалось загрузить реестр.
        <button class="btn btn-sm" onclick={() => ledger.refetch()}>Повторить</button>
      </p>
    </div>
  {:else if filteredItems.length === 0}
    <div class="standalone-card">
      <p class="text-muted">Пока нет событий в реестре.</p>
    </div>
  {:else}
    <div class="feed" aria-label="Публичный реестр">
      <div class="feed-head">
        <strong>Публичный реестр</strong>
        <span>{filteredItems.length} событий</span>
      </div>
      <div class="rail-labels">
        <span></span>
        <div class="rail-mini">
          <span class="in">вход</span>
          <span class="out">выплаты</span>
          <span class="proof">якоря</span>
          <span class="main">реестр</span>
        </div>
        <span>детали события</span>
      </div>

      {#each filteredItems as event (event.event_hash)}
        <a href={resolve(`/ledger/${event.event_hash}`)} class="event-link">
          <div class="event">
            <div class="date">
              <b>{formatTimelineDate(event.created_at_utc).dayMonth}</b>
              {formatTimelineDate(event.created_at_utc).time}
            </div>
            <div class="rail {getRailClass(event.event_type)}">
              <span class="lane in"></span>
              <span class="lane out"></span>
              <span class="lane proof"></span>
              <span class="lane main"></span>
              <span class="merge"></span>
              <span class="node">{getNodeSymbol(event.event_type)}</span>
            </div>
            <article class="card">
              <div class="card-main">
                <div class="row-top">
                  <span class="title">{getEventTitle(event)}</span>
                  {#if getPayloadAmount(event)}
                    <span class="amount {getAmountClass(event.event_type)}"
                      >{getPayloadAmount(event)}</span
                    >
                  {:else}
                    <span class="amount">#{event.sequence_no}</span>
                  {/if}
                </div>
                <div class="meta">
                  {#if getTxSignature(event.payload_json)}
                    <span><SolscanLink txSignature={getTxSignature(event.payload_json)!} /></span>
                  {/if}
                  <span>hash <code>{truncateHash(event.event_hash)}</code></span>
                </div>
              </div>
              {#if event.event_type === 'anchor_published'}
                <div class="card-extra">
                  Любой может пересчитать публичный реестр и сравнить хэш с этим якорем.
                </div>
              {/if}
            </article>
          </div>
        </a>
      {/each}
    </div>

    <Pagination hasMore={nextCursor !== null} loading={loadingMore} onload={loadMore} />
  {/if}
</section>

<style>
  .ledger-page {
    max-width: 56rem;
  }

  .head-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .head-seq {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9rem;
  }

  .export-row {
    margin-bottom: 1rem;
  }

  /* Make the entire event row clickable without breaking the grid */
  .event-link {
    text-decoration: none;
    color: inherit;
    display: contents;
  }
</style>
