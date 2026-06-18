<script lang="ts">
  import { resolve } from '$app/paths';
  import {
    postDisbursement,
    type DisbursementBody,
    type DisbursementResponse,
  } from '$lib/api/operator.js';
  import Badge from '$lib/components/ui/badge/badge.svelte';
  import HashDisplay from '$lib/components/public/HashDisplay.svelte';

  let amount = $state('');
  let giftCardCount = $state(1);
  let service = $state('Alter');
  let serviceNote = $state('');
  let receiptRef = $state('');
  let publicBeneficiaryRef = $state<'generate' | 'none'>('generate');
  let purchasedAtUtc = $state('');

  let submitting = $state(false);
  let result = $state<DisbursementResponse | null>(null);
  let error = $state('');

  function decimalToMinor(decimal: string): string {
    const num = parseFloat(decimal);
    if (isNaN(num) || num <= 0) return '';
    return String(Math.round(num * 1_000_000));
  }

  function validateForm(): string | null {
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return 'Введите корректную сумму в USDC';
    const minor = decimalToMinor(amount);
    if (!minor) return 'Не удалось конвертировать сумму';
    if (giftCardCount < 1 || giftCardCount > 1000) return 'Количество сертификатов: 1–1000';
    if (!['Alter', 'Yasno', 'Zigmund', 'Other'].includes(service)) return 'Выберите сервис';
    if (service === 'Other' && (!serviceNote.trim() || serviceNote.length > 64))
      return 'Примечание к сервису: 1–64 символа';
    if (!/^[A-Za-z0-9-]{4,64}$/.test(receiptRef))
      return 'Номер чека: 4–64 символов (буквы, цифры, дефис)';
    if (purchasedAtUtc) {
      const d = new Date(purchasedAtUtc + 'Z');
      if (isNaN(d.getTime())) return 'Некорректная дата';
      if (d.getTime() > Date.now()) return 'Дата покупки не может быть в будущем';
    }
    return null;
  }

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      error = validationError;
      return;
    }

    submitting = true;
    error = '';
    result = null;

    const body: DisbursementBody = {
      amount_usdc_minor: decimalToMinor(amount)!,
      gift_card_count: giftCardCount,
      service,
      receipt_ref: receiptRef,
      purchased_at_utc: purchasedAtUtc
        ? new Date(purchasedAtUtc + 'Z').toISOString().replace(/\.\d{3}Z$/, 'Z')
        : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };

    if (service === 'Other') body.service_note = serviceNote.trim();
    if (publicBeneficiaryRef === 'none') body.public_beneficiary_ref = null;

    const res = await postDisbursement(body);
    if (res.ok) {
      result = res.value;
    } else {
      error = res.error.message;
    }
    submitting = false;
  }

  function resetForm(): void {
    amount = '';
    giftCardCount = 1;
    service = 'Alter';
    serviceNote = '';
    receiptRef = '';
    publicBeneficiaryRef = 'generate';
    purchasedAtUtc = '';
    result = null;
    error = '';
  }
</script>

<section class="disbursement-page">
  <h1>Запись выплаты</h1>

  {#if result}
    <div class="standalone-card" style="background: #f0fdf4; border-color: var(--green);">
      <h2>Выплата записана</h2>
      <dl class="result-grid">
        <dt>Номер</dt>
        <dd>#{result.sequence_no}</dd>
        <dt>Хеш события</dt>
        <dd><HashDisplay hash={result.event_hash} full={true} /></dd>
        <dt>HEAD</dt>
        <dd><HashDisplay hash={result.head_hash} /></dd>
        {#if result.public_beneficiary_ref}
          <dt>Публичная ссылка</dt>
          <dd><code>{result.public_beneficiary_ref}</code></dd>
        {/if}
      </dl>
      <p><a href={resolve(`/ledger/${result.event_hash}`)}>Открыть в реестре →</a></p>
      <p>Следующий шаг: <a href={resolve('/admin/bot')}>отправить код через бота →</a></p>
      <button class="btn" onclick={resetForm}>Новая выплата</button>
    </div>
  {:else}
    <div class="standalone-card">
      <form onsubmit={handleSubmit}>
        <div class="form-grid">
          <label>
            <span class="form-label">Сумма (USDC)</span>
            <input
              class="form-input"
              type="text"
              placeholder="50.00"
              bind:value={amount}
              disabled={submitting}
            />
            <span class="form-hint">Например: 50.00 = 50 USDC</span>
          </label>

          <label>
            <span class="form-label">Количество сертификатов</span>
            <input
              class="form-input"
              type="number"
              value={String(giftCardCount)}
              oninput={(e) => (giftCardCount = parseInt((e.target as HTMLInputElement).value) || 1)}
              disabled={submitting}
            />
            <span class="form-hint">1–1000</span>
          </label>

          <label>
            <span class="form-label">Сервис</span>
            <select
              class="form-select"
              bind:value={service}
              onchange={() => {
                if (service !== 'Other') serviceNote = '';
              }}
              disabled={submitting}
            >
              <option value="Alter">Alter</option>
              <option value="Yasno">Yasno</option>
              <option value="Zigmund">Zigmund</option>
              <option value="Other">Другой</option>
            </select>
          </label>

          {#if service === 'Other'}
            <label>
              <span class="form-label">Примечание (обязательно для «Другой»)</span>
              <input
                class="form-input"
                type="text"
                placeholder="Название сервиса"
                bind:value={serviceNote}
                disabled={submitting}
              />
              <span class="form-hint">1–64 символа</span>
            </label>
          {/if}

          <label>
            <span class="form-label">Номер чека</span>
            <input
              class="form-input"
              type="text"
              placeholder="ALTER-2026-06-14-A1B2C3"
              bind:value={receiptRef}
              disabled={submitting}
            />
            <span class="form-hint">4–64 символов (буквы, цифры, дефис)</span>
          </label>

          <fieldset>
            <legend class="form-label">Публичная ссылка на получателя</legend>
            <label class="radio-label">
              <input
                type="radio"
                name="benref"
                value="generate"
                checked={publicBeneficiaryRef === 'generate'}
                onchange={() => (publicBeneficiaryRef = 'generate')}
                disabled={submitting}
              />
              Сгенерировать (по умолчанию)
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="benref"
                value="none"
                checked={publicBeneficiaryRef === 'none'}
                onchange={() => (publicBeneficiaryRef = 'none')}
                disabled={submitting}
              />
              Не публиковать
            </label>
          </fieldset>

          <label>
            <span class="form-label">Дата и время покупки (UTC)</span>
            <input
              class="form-input"
              type="datetime-local"
              bind:value={purchasedAtUtc}
              disabled={submitting}
            />
            <span class="form-hint">Оставьте пустым для текущего времени</span>
          </label>
        </div>

        {#if error}
          <p class="form-error">{error}</p>
        {/if}

        <p class="text-muted" style="font-size: 0.8rem; margin: 0.5rem 0; line-height: 1.4;">
          Ошибки исправляются через отдельное корректирующее событие. Не отправляйте форму повторно
          для исправления ошибки. Если доставка кода не удалась, не записывайте выплату заново —
          повторите отправку кода через страницу бота.
        </p>

        <button class="btn primary" type="submit" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Записать выплату'}
        </button>
      </form>
    </div>
  {/if}
</section>

<style>
  .disbursement-page {
    max-width: 40rem;
  }
  .form-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    cursor: pointer;
  }
  fieldset {
    border: none;
    padding: 0;
  }
  .result-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
    margin: 0.75rem 0;
  }
  .result-grid dt {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--muted);
  }
</style>
