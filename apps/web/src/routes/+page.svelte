<script lang="ts">
  import { resolve } from '$app/paths';
  import { getTotals, getLedgerEvents, getVerify } from '$lib/api/client.js';
  import { createFetch } from '$lib/state/api.svelte.js';
  import { formatUsdcAmount } from '$lib/utils/format-usdc-amount.js';
  import Timeline from '$lib/components/public/Timeline.svelte';

  const totals = createFetch(getTotals);
  const ledgerFeed = createFetch(() => getLedgerEvents({ limit: 10 }));
  const verify = createFetch(getVerify);
</script>

<svelte:head>
  <title>Открытый фонд помощи — Публичная история поддержки</title>
</svelte:head>

<main class="hero">
  <!-- LEFT COLUMN: hero text + metrics -->
  <section>
    <div class="kicker">Публичная история помощи</div>
    <h1>Живая история поддержки.</h1>
    <p class="lead">
      Пожертвования, покупки карт и ежедневные подтверждения сходятся в одну публичную историю.
      Получатели не раскрывают имён и контактов.
    </p>
    <div class="cta">
      <a href={resolve('/donate')} class="btn primary">Помочь оплатить сессии</a>
      <a href={resolve('/ledger')} class="btn">Посмотреть историю</a>
    </div>

    <!-- Metrics from API -->
    {#if totals.data}
      <div class="metrics">
        <div class="metric">
          <small>Доступно</small>
          <b>{formatUsdcAmount(totals.data.balance_usdc_minor)} USDC</b>
        </div>
        <div class="metric">
          <small>Оплачено</small>
          <b>{totals.data.disbursements_count} выплат</b>
        </div>
        <div class="metric">
          <small>Подтверждение</small>
          <b>{totals.data.anchor ? 'закреплено' : 'ожидается'}</b>
        </div>
      </div>
    {:else if totals.loading}
      <div class="metrics">
        <div class="metric"><small>Доступно</small><b>—</b></div>
        <div class="metric"><small>Оплачено</small><b>—</b></div>
        <div class="metric"><small>Подтверждение</small><b>—</b></div>
      </div>
    {/if}
  </section>

  <!-- RIGHT COLUMN: multi-rail timeline feed -->
  <section class="feed" aria-label="Публичная история фонда">
    <div class="feed-head">
      <strong>Публичная история</strong>
      {#if totals.data}
        <span>{totals.data.donations_count + totals.data.disbursements_count} событий</span>
      {/if}
    </div>

    {#if ledgerFeed.loading}
      <div style="padding: 40px; text-align: center; color: var(--muted);">Загрузка...</div>
    {:else if ledgerFeed.error}
      <div style="padding: 40px; text-align: center; color: var(--muted);">
        Не удалось загрузить историю.
        <button class="btn btn-sm" onclick={() => ledgerFeed.refetch()}>Повторить</button>
      </div>
    {:else if ledgerFeed.data && ledgerFeed.data.items.length > 0}
      <Timeline
        events={ledgerFeed.data.items}
        headInfo={verify.data
          ? { head_hash: verify.data.head_hash, head_sequence_no: verify.data.head_sequence_no }
          : null}
        totals={totals.data ? { balance_usdc_minor: totals.data.balance_usdc_minor } : null}
      />
    {:else}
      <div style="padding: 40px; text-align: center; color: var(--muted);">Пока нет событий.</div>
    {/if}
  </section>
</main>
