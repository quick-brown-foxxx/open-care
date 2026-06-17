<script lang="ts">
  import { hasToken, onUserActivity } from '$lib/state/token.svelte.js';
  import TokenGate from '$lib/components/admin/TokenGate.svelte';
  import AdminNav from '$lib/components/admin/AdminNav.svelte';

  let { children } = $props();

  let authed = $derived(hasToken());

  $effect(() => {
    if (authed) {
      const events = ['click', 'keypress', 'scroll', 'mousemove'] as const;
      for (const ev of events) {
        document.addEventListener(ev, onUserActivity, { passive: true });
      }
      return () => {
        for (const ev of events) {
          document.removeEventListener(ev, onUserActivity);
        }
      };
    }
  });
</script>

<svelte:head>
  <title>Администрирование — Open Care</title>
</svelte:head>

<section class="admin-layout">
  {#if !authed}
    <div class="gate-wrapper">
      <TokenGate />
    </div>
  {:else}
    <AdminNav active="dashboard" />
    <main>
      {@render children()}
    </main>
  {/if}
</section>

<style>
  .admin-layout {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
  .gate-wrapper {
    max-width: 28rem;
    margin: 4rem auto;
  }
</style>
