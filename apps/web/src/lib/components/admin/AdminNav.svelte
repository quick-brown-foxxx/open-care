<script lang="ts">
  import { clearToken } from '$lib/state/token.svelte.js';
  import Button from '$lib/components/ui/button/button.svelte';

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
      <a href={link.href} class:active={active === link.key}>{link.label}</a>
    {/each}
  </div>
  <Button variant="ghost" size="sm" onclick={clearToken}>Выйти</Button>
</nav>

<style>
  .admin-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 1.5rem;
  }
  .nav-links {
    display: flex;
    gap: 1rem;
  }
  .nav-links a {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    text-decoration: none;
    font-weight: 500;
    padding: 0.25rem 0;
    border-bottom: 2px solid transparent;
  }
  .nav-links a:hover {
    color: var(--color-primary);
  }
  .nav-links a.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }
</style>
