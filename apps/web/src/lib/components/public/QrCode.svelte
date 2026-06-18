<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  let {
    text,
    size = 160,
    class: className = '',
  }: {
    text: string;
    size?: number;
    class?: string;
  } = $props();

  let qrDataUri = $state<string>('');

  $effect(() => {
    import('qrcode')
      .then((QRCode) => {
        QRCode.toString(text, {
          type: 'svg',
          width: size,
          margin: 2,
          color: { dark: '#35251d', light: '#ffffff' },
        })
          .then((svg: string) => {
            const encoded = encodeURIComponent(svg);
            qrDataUri = `data:image/svg+xml,${encoded}`;
          })
          .catch(() => {
            qrDataUri = '';
          });
      })
      .catch(() => {
        qrDataUri = '';
      });
  });
</script>

<div
  class={cn(className)}
  style="width: {size}px; height: {size}px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden;"
>
  {#if qrDataUri}
    <img
      src={qrDataUri}
      alt="QR-код адреса {text}"
      width={size}
      height={size}
      style="display: block; width: 100%; height: 100%;"
    />
  {:else}
    <span style="font-size: 0.85rem; color: var(--muted);">QR</span>
  {/if}
</div>
