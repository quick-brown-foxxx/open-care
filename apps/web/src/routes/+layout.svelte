<script lang="ts">
  import '../app.css';
  let { children } = $props();
  let mobileMenuOpen = $state(false);
</script>

<header class="site-header">
  <div class="header-inner">
    <a href="/" class="logo">Open Care</a>
    <button
      class="menu-toggle"
      onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      aria-label="Меню"
    >
      {mobileMenuOpen ? '✕' : '☰'}
    </button>
    <nav class="nav-links" class:open={mobileMenuOpen}>
      <a href="/">Главная</a>
      <a href="/donate">Пожертвовать</a>
      <a href="/ledger">Реестр</a>
      <a href="/verify">Проверка</a>
      <a href="/about">О проекте</a>
      <a href="/faq">Вопросы</a>
      <a href="/contact">Контакты</a>
    </nav>
  </div>
</header>

<main class="main-content">
  {@render children()}
</main>

<footer class="site-footer">
  <div class="footer-inner">
    <p>Open Care — прозрачная благотворительность на Solana</p>
    <nav>
      <a href="/verify">Проверка</a>
      <a href="/contact">Контакты</a>
    </nav>
  </div>
</footer>

<style>
  .site-header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-inner {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    text-decoration: none;
  }
  .menu-toggle {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text);
  }
  .nav-links {
    display: flex;
    gap: 1.25rem;
  }
  .nav-links a {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    text-decoration: none;
    font-weight: 500;
  }
  .nav-links a:hover {
    color: var(--color-primary);
  }
  @media (max-width: 768px) {
    .menu-toggle {
      display: block;
    }
    .nav-links {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-surface);
      flex-direction: column;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .nav-links.open {
      display: flex;
    }
  }
  .main-content {
    flex: 1;
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 2rem 1.5rem;
    width: 100%;
  }
  .site-footer {
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    padding: 1.5rem;
    margin-top: 2rem;
  }
  .footer-inner {
    max-width: var(--max-width);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }
  .footer-inner nav {
    display: flex;
    gap: 1rem;
  }
  .footer-inner nav a {
    color: var(--color-text-muted);
    text-decoration: none;
  }
  .footer-inner nav a:hover {
    color: var(--color-primary);
  }
  @media (max-width: 768px) {
    .footer-inner {
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }
  }
</style>
