<script lang="ts">
  import {
    getPendingRequests,
    postSendCode,
    type PendingRequest,
    type PendingRequestsResponse,
    type SendCodeResponse,
  } from '$lib/api/operator.js';
  import { createFetch } from '$lib/state/api.svelte.js';
  import type { Result } from '$lib/api/client.js';
  import { formatDate } from '$lib/utils/format-date.js';
  import Badge from '$lib/components/ui/badge/badge.svelte';

  /** Adapt operator OpResult to public Result (both use ApiError now). */
  async function adaptedGetPendingRequests(): Promise<Result<PendingRequestsResponse>> {
    const res = await getPendingRequests();
    if (res.ok) return res;
    return { ok: false, error: res.error };
  }

  const requests = createFetch(adaptedGetPendingRequests);

  let selected = $state<PendingRequest | null>(null);
  let code = $state('');
  let sending = $state(false);
  let sendResult = $state<SendCodeResponse | null>(null);
  let sendError = $state('');

  // Clear code on route leave / component destroy
  $effect(() => {
    return () => {
      code = '';
    };
  });

  function selectRequest(req: PendingRequest): void {
    selected = req;
    code = '';
    sendResult = null;
    sendError = '';
  }

  async function handleSend(): Promise<void> {
    if (!selected || !code.trim()) return;
    sending = true;
    sendError = '';
    sendResult = null;

    const res = await postSendCode({
      opaque_id: selected.opaque_id,
      conversation_id: selected.conversation_id,
      code: code.trim(),
    });

    if (res.ok) {
      sendResult = res.value;
      code = '';
    } else {
      sendError = res.error.message;
    }
    sending = false;
  }

  const statusLabel: Record<string, string> = {
    pending: 'Ожидает',
    disbursement_recorded: 'Выплата записана',
    code_delivered: 'Код доставлен',
    cancelled: 'Отменён',
  };
</script>

<section class="bot-page">
  <h1>Доставка сертификатов</h1>

  <!-- Pending requests -->
  <h2>Запросы на доставку</h2>
  {#if requests.loading}
    <p class="text-muted">Загрузка...</p>
  {:else if requests.error}
    <div class="standalone-card" style="border-color: #c44;">
      <p>
        Ошибка: {requests.error.message}.
        <button class="btn btn-sm" onclick={() => requests.refetch()}>Повторить</button>
      </p>
    </div>
  {:else if requests.data && requests.data.items.length > 0}
    <div class="request-list">
      {#each requests.data.items as req (req.opaque_id)}
        <button
          class="standalone-card request-row"
          class:selected={selected?.opaque_id === req.opaque_id}
          onclick={() => selectRequest(req)}
        >
          <Badge variant={req.request_status === 'pending' ? 'default' : 'green'}>
            {statusLabel[req.request_status] ?? req.request_status}
          </Badge>
          {#if req.internal_handle}
            <span class="req-handle">{req.internal_handle}</span>
          {/if}
          <span class="text-muted req-time">{formatDate(req.created_at_utc)}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="standalone-card"><p class="text-muted">Нет активных запросов.</p></div>
  {/if}

  <!-- Selected request detail -->
  {#if selected}
    <h2>Выбранный запрос</h2>
    <div class="standalone-card">
      <dl class="detail-grid">
        <dt>opaque_id</dt>
        <dd><code>{selected.opaque_id}</code></dd>
        <dt>conversation_id</dt>
        <dd><code>{selected.conversation_id}</code></dd>
        {#if selected.internal_handle}
          <dt>Получатель</dt>
          <dd>{selected.internal_handle}</dd>
        {/if}
        <dt>Статус</dt>
        <dd>{statusLabel[selected.request_status] ?? selected.request_status}</dd>
        <dt>Создан</dt>
        <dd>{formatDate(selected.created_at_utc)}</dd>
        <dt>Обновлён</dt>
        <dd>{formatDate(selected.updated_at_utc)}</dd>
      </dl>

      <p class="text-muted" style="font-size: 0.85rem;">
        Сначала запишите выплату через <a href="/admin/disbursements">страницу выплат</a>, затем
        вернитесь сюда для отправки кода.
      </p>
    </div>

    <!-- Send code -->
    <h2>Отправка кода</h2>
    {#if sendResult}
      <div class="standalone-card" style="background: #f0fdf4; border-color: var(--green);">
        <p>Код доставлен: {formatDate(sendResult.delivered_at_utc)}</p>
        <button
          class="btn"
          onclick={() => {
            sendResult = null;
            selected = null;
          }}>Готово</button
        >
      </div>
    {:else}
      <div class="standalone-card">
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <label>
            <span class="form-label">Код сертификата</span>
            <input
              class="form-input"
              type="text"
              placeholder="Введите код сертификата"
              autocomplete="off"
              bind:value={code}
              disabled={sending}
            />
            <span class="form-hint">Код будет очищен после отправки</span>
          </label>

          {#if sendError}
            <p class="form-error">{sendError}</p>
          {/if}

          <button class="btn primary" type="submit" disabled={sending || !code.trim()}>
            {sending ? 'Отправка...' : 'Отправить код'}
          </button>
        </form>
      </div>
    {/if}
  {/if}
</section>

<style>
  .bot-page {
    max-width: 40rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .request-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .request-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
    color: var(--title);
    flex-wrap: wrap;
    border: 1px solid var(--border);
  }
  .request-row.selected {
    border-color: var(--blue);
    background: #eff6ff;
  }
  .req-handle {
    font-weight: 500;
  }
  .req-time {
    font-size: 0.8rem;
    margin-left: auto;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
    margin-bottom: 0.75rem;
  }
  .detail-grid dt {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--muted);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
