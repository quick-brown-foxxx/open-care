<script lang="ts">
  import { formatUsdcAmount } from '$lib/utils/format-usdc-amount.js';
  import { truncateHash } from '$lib/utils/truncate-hash.js';
  import { formatSolscanUrl } from '$lib/utils/format-solscan-url.js';
  import type { LedgerEventItem } from '$lib/schemas/ledger-events.js';

  interface DonationPayload {
    tx_signature: string;
    amount_usdc_minor: string;
    cluster: string;
  }

  interface DisbursementPayload {
    amount_usdc_minor: string;
    gift_card_count: number;
    service: string;
    receipt_ref: string;
    public_beneficiary_ref: string | null;
  }

  interface AnchorPayload {
    tx_signature: string;
    anchored_head_hash: string;
    cluster: string;
  }

  interface CorrectionPayload {
    corrects_sequence_no: number;
    reason: string;
    replacement_fields: Record<string, string>;
  }

  let { event }: { event: LedgerEventItem } = $props();

  const payload = $derived(tryParse(event.payload_json));
  const shortHash = $derived(truncateHash(event.event_hash));

  function tryParse(json: string): Record<string, unknown> | null {
    try {
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
</script>

{#if event.event_type === 'donation_confirmed' && payload}
  {@const p = payload as unknown as DonationPayload}
  <article class="card">
    <div class="card-main">
      <div class="row-top">
        <span class="title">Анонимное пожертвование</span>
        <span class="amount in">+{formatUsdcAmount(p.amount_usdc_minor)} USDC</span>
      </div>
      <div class="meta">
        <span
          >tx <a
            href={formatSolscanUrl(p.tx_signature, p.cluster)}
            target="_blank"
            rel="noopener noreferrer">{truncateHash(p.tx_signature)}</a
          ></span
        >
        <span>hash <code>{shortHash}</code></span>
      </div>
    </div>
  </article>
{:else if event.event_type === 'disbursement_recorded' && payload}
  {@const p = payload as unknown as DisbursementPayload}
  <article class="card">
    <div class="card-main">
      <div class="row-top">
        <span class="title">Куплены подарочные карты {p.service} &times;{p.gift_card_count}</span>
        <span class="amount out">&minus;{formatUsdcAmount(p.amount_usdc_minor)} USDC</span>
      </div>
      <div class="meta">
        <span>чек <code>{p.receipt_ref}</code></span>
        {#if p.public_beneficiary_ref}
          <span>получатель <code>{p.public_beneficiary_ref}</code></span>
        {/if}
      </div>
      <div class="chip-row">
        <span class="chip">без имён получателей</span>
        <span class="chip">чек опубликован</span>
      </div>
    </div>
  </article>
{:else if event.event_type === 'anchor_published' && payload}
  {@const p = payload as unknown as AnchorPayload}
  <article class="card">
    <div class="card-main">
      <div class="row-top">
        <span class="title">Хэш реестра закреплён в Solana</span>
        <span class="amount anchor">ok</span>
      </div>
      <div class="meta">
        <span
          >anchor tx <a
            href={formatSolscanUrl(p.tx_signature, p.cluster)}
            target="_blank"
            rel="noopener noreferrer">{truncateHash(p.tx_signature)}</a
          ></span
        >
        <span>sha256 <code>{truncateHash(p.anchored_head_hash)}</code></span>
      </div>
    </div>
    <div class="card-extra">
      Любой может пересчитать публичный реестр и сравнить хэш с этим якорем.
    </div>
  </article>
{:else if event.event_type === 'correction_recorded' && payload}
  {@const p = payload as unknown as CorrectionPayload}
  <article class="card">
    <div class="card-main">
      <div class="row-top">
        <span class="title">Коррекция #{p.corrects_sequence_no}</span>
        <span class="amount">&mdash;</span>
      </div>
      <div class="meta">
        <span>{p.reason}</span>
        {#each Object.entries(p.replacement_fields) as [key, value]}
          <span><code>{key}</code> &rarr; <code>{value}</code></span>
        {/each}
      </div>
    </div>
  </article>
{:else}
  <article class="card">
    <div class="card-main">
      <div class="row-top">
        <span class="title">Событие #{event.sequence_no}</span>
        <span class="amount">&mdash;</span>
      </div>
      <div class="meta">
        <span>hash <code>{shortHash}</code></span>
      </div>
    </div>
  </article>
{/if}
