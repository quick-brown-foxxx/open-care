<script lang="ts">
  import { clearToken } from '$lib/state/token.svelte.js';

  let {
    active = '',
  }: {
    active?: string;
  } = $props();

  const links = [
    { href: '/admin', label: 'Дашборд', key: 'dashboard' },
    { href: '/admin/disbursements', label: 'Выплаты', key: 'disbursements' },
    { href: '/admin/anchors', label: 'Якоря', key: 'anchors' },
    { href: '/admin/bot', label: 'Бот', key: 'bot' },
  ];
</script>

<nav class="admin-nav">
  <div class="nav-links">
    {#each links as link}
      <a href={link.href} class="btn btn-sm" class:primary={active === link.key}>{link.label}</a>
    {/each}
  </div>
  <button class="btn btn-sm" onclick={clearToken}>Выйти</button>
</nav>

<style>
  .admin-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-soft);
    margin-bottom: 1.5rem;
  }
  .nav-links {
    display: flex;
    gap: 0.5rem;
  }
</style>
