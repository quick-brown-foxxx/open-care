<script lang="ts">
  import { getHealth, getTotals, getVerify } from '$lib/api/client.js';
  import { createFetch } from '$lib/state/api.svelte.js';
  import { formatDate } from '$lib/utils/format-date.js';
  import { formatUsdc } from '$lib/utils/format-usdc.js';
  import Card from '$lib/components/ui/card/card.svelte';
  import Badge from '$lib/components/ui/badge/badge.svelte';
  import HashDisplay from '$lib/components/public/HashDisplay.svelte';
  import SolscanLink from '$lib/components/public/SolscanLink.svelte';
  import AdminNav from '$lib/components/admin/AdminNav.svelte';

  const health = createFetch(getHealth);
  const totals = createFetch(getTotals);
  const verify = createFetch(getVerify);
</script>

<AdminNav active="dashboard" />

<section class="dashboard">
  <h1>Дашборд</h1>

  <!-- Health -->
  <h2>Состояние системы</h2>
  {#if health.loading}
    <p class="muted">Загрузка...</p>
  {:else if health.error}
    <Card class="error-card"
      ><p>Ошибка загрузки. <button onclick={() => health.refetch()}>Повторить</button></p></Card
    >
  {:else if health.data}
    <Card>
      <p>
        Статус: <Badge variant={health.data.status === 'ok' ? 'accent' : 'danger'}
          >{health.data.status === 'ok' ? 'OK' : 'DEGRADED'}</Badge
        >
      </p>
      <dl class="checks-grid">
        <dt>База данных</dt>
        <dd>{health.data.checks.db_reachable ? '✓' : '✗'}</dd>
        <dt>Якорь не устарел</dt>
        <dd>{!health.data.checks.anchor_stale ? '✓' : '✗'}</dd>
        <dt>Баланс SOL якоря</dt>
        <dd>{!health.data.checks.anchor_wallet_low_sol ? '✓' : '✗'}</dd>
        <dt>Ingest активен</dt>
        <dd>{health.data.checks.ingest_recent_or_empty ? '✓' : '✗'}</dd>
        <dt>Helius без задержек</dt>
        <dd>{health.data.checks.helius_inbox_backlog_ok ? '✓' : '✗'}</dd>
      </dl>
    </Card>
  {/if}

  <!-- Head -->
  <h2>Текущий HEAD</h2>
  {#if verify.loading}
    <p class="muted">Загрузка...</p>
  {:else if verify.data}
    <Card>
      <HashDisplay hash={verify.data.head_hash} label="HEAD" full={true} />
      <span class="head-seq">#{verify.data.head_sequence_no}</span>
    </Card>
  {/if}

  <!-- Anchor -->
  <h2>Последний якорь</h2>
  {#if totals.loading}
    <p class="muted">Загрузка...</p>
  {:else if totals.data?.anchor}
    <Card>
      <HashDisplay hash={totals.data.anchor.anchored_head_hash} label="Закреплённый HEAD" />
      <p>Опубликован: {formatDate(totals.data.anchor.published_at_utc)}</p>
      <SolscanLink txSignature={totals.data.anchor.tx_signature} />
    </Card>
  {:else if totals.data}
    <Card><p>Якорь ещё не опубликован.</p></Card>
  {/if}

  {#if totals.data?.anchor_stale}
    <Card class="warning-card"><Badge variant="danger">Якорь устарел (более 25 часов)</Badge></Card>
  {/if}

  {#if totals.data?.anchor_wallet_low_sol}
    <Card class="error-card">
      <Badge variant="danger">Низкий баланс SOL</Badge>
      <p>
        Баланс SOL на кошельке якоря низкий. Публикация якоря может быть невозможна. Пополните
        кошелёк якоря.
      </p>
    </Card>
  {/if}

  <!-- Quick links -->
  <h2>Действия</h2>
  <div class="quick-links">
    <Card><a href="/admin/disbursements">Записать выплату →</a></Card>
    <Card><a href="/admin/anchors">Управление якорем →</a></Card>
    <Card><a href="/admin/bot">Доставка сертификатов →</a></Card>
  </div>
</section>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .checks-grid {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.375rem 1rem;
    margin-top: 0.5rem;
  }
  .checks-grid dt {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }
  .checks-grid dd {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .head-seq {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
  .quick-links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .quick-links a {
    text-decoration: none;
    font-weight: 500;
  }
  .muted {
    color: var(--color-text-muted);
  }
  .error-card {
    border-color: var(--color-danger);
  }
  .warning-card {
    border-color: #f59e0b;
  }
</style>
