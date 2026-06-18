<script lang="ts">
  import { resolve } from '$app/paths';
  import { getVerify, getBaseUrl } from '$lib/api/client.js';
  import { createFetch } from '$lib/state/api.svelte.js';
  import { formatDate } from '$lib/utils/format-date.js';
  import Badge from '$lib/components/ui/badge/badge.svelte';
  import HashDisplay from '$lib/components/public/HashDisplay.svelte';
  import SolscanLink from '$lib/components/public/SolscanLink.svelte';
  import CopyButton from '$lib/components/public/CopyButton.svelte';

  import type { ApiError } from '$lib/api/client.js';

  const verify = createFetch(getVerify);

  /**
   * Map an ApiError code to a stable Russian user-facing message.
   * Never exposes raw error.message which may contain stack traces or internal paths.
   */
  function errorMessage(err: ApiError): string {
    switch (err.code) {
      case 'NETWORK_ERROR':
        return 'Ошибка сети. Проверьте подключение и попробуйте снова.';
      case 'VALIDATION_ERROR':
        return 'Ошибка формата данных. Пожалуйста, сообщите об этом.';
      case 'PARSE_ERROR':
        return 'Ошибка обработки ответа сервера. Попробуйте обновить страницу.';
      default:
        return 'Произошла ошибка при загрузке данных. Попробуйте обновить страницу.';
    }
  }

  /**
   * Format a YYYY-MM-DD anchor date to DD.MM.YYYY for display.
   * "2026-06-14" → "14.06.2026"
   */
  function formatAnchorDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
</script>

<svelte:head>
  <title>Проверка — Open Care</title>
</svelte:head>

<section class="verify-page">
  <h1>Проверка реестра</h1>
  <p class="lead">
    Независимая проверка целостности реестра пожертвований. Все данные можно верифицировать через
    хеш-цепочку и якоря в блокчейне Solana.
  </p>

  {#if verify.loading}
    <!-- Loading skeleton -->
    <div class="standalone-card">
      <div class="skeleton skeleton--lg"></div>
      <div class="skeleton"></div>
      <div class="skeleton skeleton--sm"></div>
    </div>
    <div class="standalone-card">
      <div class="skeleton skeleton--md"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
    <div class="standalone-card">
      <div class="skeleton skeleton--md"></div>
      <div class="skeleton skeleton--sm"></div>
    </div>
  {:else if verify.error}
    <!-- Error state -->
    <div class="standalone-card" style="border-color: #c44">
      <h2>Ошибка загрузки</h2>
      <p class="form-error">{errorMessage(verify.error)}</p>
      {#if verify.error.requestId}
        <p class="text-muted" style="font-size: 0.85rem">ID запроса: {verify.error.requestId}</p>
      {/if}
      <button
        type="button"
        class="btn"
        style="margin-top: 0.75rem"
        onclick={() => verify.refetch()}
      >
        Попробовать снова
      </button>
    </div>
  {:else if verify.data}
    {@const data = verify.data}

    <!-- 1. Current HEAD hash (prominent) -->
    <div class="standalone-card" style="border-color: var(--title); border-width: 2px">
      <h2>Текущий HEAD реестра</h2>
      <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 1rem">
        HEAD — это последняя запись в реестре. Хеш HEAD вычисляется как SHA-256 от всех предыдущих
        записей, образуя непрерывную хеш-цепочку. Если хотя бы одна запись будет изменена, хеш HEAD
        изменится.
      </p>
      <div class="head-hash">
        <HashDisplay hash={data.head_hash} full label={`HEAD #${data.head_sequence_no}`} />
      </div>
    </div>

    <!-- 4. Pre-anchor-head explanation (prominent) -->
    <div class="standalone-card" style="background: #fffbeb; border-color: #fcd34d">
      <div class="explanation-row">
        <span class="explanation-icon" aria-hidden="true">ℹ️</span>
        <p>
          <strong>Якорь фиксирует HEAD реестра, существовавший ДО публикации якоря.</strong>
          Сама запись о публикации якоря будет покрыта следующим якорем. Это означает, что каждый якорь
          подтверждает все события, произошедшие до него, но не включает сам факт своей публикации.
        </p>
      </div>
    </div>

    <!-- 2. Latest anchor info -->
    <div class="standalone-card">
      <h2>Последний якорь</h2>
      {#if data.latest_anchor}
        {@const anchor = data.latest_anchor}
        <dl class="anchor-details">
          <dt>Дата якоря</dt>
          <dd>{formatAnchorDate(anchor.anchor_date)}</dd>

          <dt>Зафиксированный HEAD</dt>
          <dd>
            <HashDisplay
              hash={anchor.anchored_head_hash}
              label={`SEQ #${anchor.anchored_head_sequence_no}`}
            />
          </dd>

          <dt>Memo</dt>
          <dd class="anchor-memo">
            <code>{anchor.memo_text}</code>
            <CopyButton text={anchor.memo_text} label="Копировать" />
          </dd>

          <dt>Транзакция</dt>
          <dd>
            <SolscanLink txSignature={anchor.tx_signature} />
          </dd>

          <dt>Адрес якорного кошелька</dt>
          <dd class="anchor-wallet">
            <code>{anchor.anchor_wallet_address}</code>
            <CopyButton text={anchor.anchor_wallet_address} label="Копировать" />
          </dd>

          <dt>Опубликован</dt>
          <dd>{formatDate(anchor.published_at_utc)}</dd>
        </dl>
      {:else}
        <div class="empty-state">
          <p>Якорь ещё не опубликован.</p>
          <p class="text-muted" style="font-size: 0.85rem">
            Реестр всё ещё можно проверить по хеш-цепочке. Якорь будет опубликован при следующем
            запуске cron-процесса (ежедневно в 01:00 UTC).
          </p>
        </div>
      {/if}
    </div>

    <!-- 7. Anchor staleness warning -->
    {#if data.anchor_stale}
      <div class="standalone-card" style="border-color: var(--amber)">
        <Badge variant="amber">⚠ Предупреждение</Badge>
        <p style="margin-top: 0.75rem; margin-bottom: 0; color: var(--amber); font-size: 0.95rem">
          Якорь устарел. Последняя публикация была более 25 часов назад. Это может указывать на
          проблему с cron-процессом публикации якорей. Целостность реестра при этом не нарушена —
          все записи по-прежнему связаны хеш-цепочкой.
        </p>
      </div>
    {/if}

    <!-- 3. Previous anchors list -->
    <div class="standalone-card">
      <h2>Предыдущие якоря</h2>
      {#if data.previous_anchors.length > 0}
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>HEAD хеш</th>
                <th>Транзакция</th>
              </tr>
            </thead>
            <tbody>
              {#each data.previous_anchors as anchor (anchor.tx_signature)}
                <tr>
                  <td class="cell-date">
                    {formatAnchorDate(anchor.anchor_date)}
                  </td>
                  <td>
                    <HashDisplay hash={anchor.anchored_head_hash} />
                  </td>
                  <td>
                    <SolscanLink txSignature={anchor.tx_signature} />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="empty-state">
          <p>Предыдущих якорей нет.</p>
          <p class="text-muted" style="font-size: 0.85rem">
            История якорей появится после нескольких ежедневных публикаций.
          </p>
        </div>
      {/if}
    </div>

    <!-- 5. Verification instructions -->
    <div class="standalone-card">
      <h2>Инструкции по проверке</h2>
      <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 0.75rem">
        Приведённый ниже код позволяет независимо проверить целостность реестра. Скопируйте его и
        выполните в среде Node.js или Deno.
      </p>
      {#if data.instructions.typescript}
        <pre class="code-block"><code>{data.instructions.typescript}</code></pre>
      {:else}
        <div class="empty-state">
          <p>Инструкции по проверке временно недоступны.</p>
          <p class="text-muted" style="font-size: 0.85rem">
            Вы можете скачать полный реестр и проверить хеш-цепочку вручную: каждая запись содержит
            <code>prev_event_hash</code>, ссылающийся на предыдущую запись. HEAD реестра — это
            SHA-256 от последней записи.
          </p>
        </div>
      {/if}
    </div>

    <!-- 6. Export link -->
    <div class="standalone-card">
      <h2>Экспорт данных</h2>
      <p>
        Полный реестр событий доступен для скачивания в формате JSON. Используйте эти данные для
        независимой верификации хеш-цепочки.
      </p>
      <a
        href="{getBaseUrl()}/api/ledger-events"
        class="btn"
        target="_blank"
        rel="noopener noreferrer"
      >
        Скачать полный реестр (JSON) ↗
      </a>
    </div>

    <!-- 8. Troubleshooting section -->
    <div class="standalone-card">
      <h2>Решение проблем</h2>
      <ul class="troubleshooting-list">
        <li>
          <strong>Если хеш не совпадает:</strong>
          свяжитесь с нами через
          <a href={resolve('/contact')}>форму обратной связи</a>. Опишите, какой именно хеш не
          совпадает, и приложите ссылку на страницу.
        </li>
        <li>
          <strong>Если якорь отсутствует:</strong>
          реестр всё ещё можно проверить по хеш-цепочке. Скачайте полный реестр и проверьте, что
          <code>prev_event_hash</code> каждой записи совпадает с хешем предыдущей.
        </li>
        <li>
          <strong>Если якорь устарел:</strong>
          это не влияет на целостность данных. Якорь будет обновлён при следующей успешной публикации.
        </li>
      </ul>
    </div>
  {/if}
</section>

<style>
  .verify-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* HEAD hash highlight */
  .head-hash {
    padding: 0.75rem;
    background: rgba(111, 130, 214, 0.08);
    border-radius: 12px;
    overflow-x: auto;
  }

  /* Explanation card layout */
  .explanation-row {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .explanation-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .explanation-row p {
    margin-bottom: 0;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* Anchor details grid */
  .anchor-details {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .anchor-details dt {
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .anchor-details dd {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .anchor-memo,
  .anchor-wallet {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* Table wrapper for horizontal scroll */
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .cell-date {
    white-space: nowrap;
    color: var(--muted);
    font-size: 0.85rem;
  }

  /* Code block */
  .code-block {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 1rem;
    border-radius: 12px;
    overflow-x: auto;
    font-size: 0.85rem;
    line-height: 1.5;
    max-height: 24rem;
    overflow-y: auto;
  }

  .code-block code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: pre;
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 1.5rem 0;
  }

  .empty-state p {
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  /* Troubleshooting list */
  .troubleshooting-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .troubleshooting-list li {
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* Skeleton sizes */
  .skeleton--lg {
    height: 1.5rem;
    width: 50%;
  }

  .skeleton--md {
    height: 1rem;
    width: 35%;
  }

  .skeleton--sm {
    width: 25%;
  }
</style>
