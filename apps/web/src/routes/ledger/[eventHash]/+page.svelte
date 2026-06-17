<script lang="ts">
  import { page } from '$app/state';
  import { getLedgerEvents } from '$lib/api/client.js';
  import { createFetch } from '$lib/state/api.svelte.js';
  import { formatDate } from '$lib/utils/format-date.js';
  import { formatUsdc } from '$lib/utils/format-usdc.js';
  import Card from '$lib/components/ui/card/card.svelte';
  import Badge from '$lib/components/ui/badge/badge.svelte';
  import HashDisplay from '$lib/components/public/HashDisplay.svelte';
  import SolscanLink from '$lib/components/public/SolscanLink.svelte';
  import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

  const eventHash = $derived(page.params.eventHash);

  // Validate eventHash is 64-char lowercase hex
  const isValidHash = $derived(/^[0-9a-f]{64}$/.test(eventHash));

  // Fetch all ledger events and find the matching one
  const ledger = createFetch(() => getLedgerEvents({ limit: 500 }));

  const event = $derived.by(() => {
    if (!ledger.data) return null;
    return ledger.data.items.find((e) => e.event_hash === eventHash) ?? null;
  });

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

  function getTxSignature(payloadJson: string): string | null {
    try {
      const p = JSON.parse(payloadJson) as Record<string, unknown>;
      if (typeof p.tx_signature === 'string') return p.tx_signature;
      return null;
    } catch {
      return null;
    }
  }

  function getPayloadAmount(payloadJson: string): string | null {
    try {
      const p = JSON.parse(payloadJson) as Record<string, unknown>;
      if (typeof p.amount_usdc_minor === 'string') return formatUsdc(p.amount_usdc_minor);
      return null;
    } catch {
      return null;
    }
  }

  function formatPayload(payloadJson: string): string {
    try {
      return JSON.stringify(JSON.parse(payloadJson) as unknown, null, 2);
    } catch {
      return payloadJson;
    }
  }
</script>

<svelte:head>
  <title>Событие {eventHash.slice(0, 8)}... — Open Care</title>
</svelte:head>

<section class="event-detail-page">
  <p><a href="/ledger">← Назад к реестру</a></p>

  {#if !isValidHash}
    <Card class="error-card">
      <h1>Неверный хеш</h1>
      <p>Хеш события должен быть 64-значной шестнадцатеричной строкой.</p>
    </Card>
  {:else if ledger.loading}
    <p class="muted">Загрузка...</p>
  {:else if ledger.error}
    <Card class="error-card">
      <p>
        Не удалось загрузить реестр. <button onclick={() => ledger.refetch()}>Повторить</button>
      </p>
    </Card>
  {:else if !event}
    <Card>
      <h1>Событие не найдено</h1>
      <p>Событие с хешем <HashDisplay hash={eventHash} full={true} /> не найдено в реестре.</p>
    </Card>
  {:else}
    <h1>Событие #{event.sequence_no}</h1>

    <Card>
      <dl class="detail-grid">
        <dt>Тип</dt>
        <dd>
          <Badge variant={eventTypeVariant[event.event_type] ?? 'default'}
            >{eventTypeLabel[event.event_type] ?? event.event_type}</Badge
          >
        </dd>

        <dt>Номер</dt>
        <dd>#{event.sequence_no}</dd>

        {#if getPayloadAmount(event.payload_json)}
          <dt>Сумма</dt>
          <dd>{getPayloadAmount(event.payload_json)}</dd>
        {/if}

        <dt>Хеш события</dt>
        <dd><HashDisplay hash={event.event_hash} full={true} /></dd>

        <dt>Предыдущий хеш</dt>
        <dd><HashDisplay hash={event.prev_hash} full={true} /></dd>

        <dt>Создано</dt>
        <dd>{formatDate(event.created_at_utc)}</dd>

        {#if getTxSignature(event.payload_json)}
          <dt>Транзакция</dt>
          <dd><SolscanLink txSignature={getTxSignature(event.payload_json)!} /></dd>
        {/if}
      </dl>
    </Card>

    <!-- Hash chain context -->
    <Card class="context-card">
      <h2>Хеш-цепочка</h2>
      <p>
        Это событие ссылается на предыдущий хеш <HashDisplay hash={event.prev_hash} />. Изменение
        любого предыдущего события изменит этот хеш и все последующие.
      </p>
      {#if event.event_type === 'anchor_published'}
        <p>
          Якорь фиксирует HEAD реестра, существовавший ДО этого события. Сама эта запись будет
          покрыта следующим якорем.
        </p>
      {/if}
    </Card>

    <!-- Payload -->
    <Card>
      <h2>Данные события (payload)</h2>
      <pre class="payload-block"><code>{formatPayload(event.payload_json)}</code></pre>
    </Card>
  {/if}
</section>

<style>
  .event-detail-page {
    max-width: 48rem;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem 1.5rem;
  }
  .detail-grid dt {
    font-weight: 600;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .detail-grid dd {
    font-size: 0.95rem;
  }
  .context-card {
    background: #fefce8;
  }
  .payload-block {
    background: #1a1a2e;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: var(--radius);
    overflow-x: auto;
    font-size: 0.8rem;
    line-height: 1.5;
    max-height: 400px;
    overflow-y: auto;
  }
  .payload-block code {
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
  .muted {
    color: var(--color-text-muted);
  }
  .error-card {
    border-color: var(--color-danger);
  }
</style>
