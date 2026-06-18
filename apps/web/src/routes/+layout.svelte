<script lang="ts">
  import '../app.css';
  import { resolve } from '$app/paths';
  let { children } = $props();
</script>

<div class="page">
  <div class="wrap">
    <header class="topline">
      <a href={resolve('/')} class="brand">
        <span class="mark">◦</span>
        <span>Открытый фонд помощи</span>
      </a>
      <nav class="links" aria-label="Навигация">
        <a href={resolve('/donate')}>Помочь</a>
        <a href={resolve('/ledger')}>История</a>
        <a href={resolve('/verify')}>Проверить</a>
        <a href={resolve('/about')}>О проекте</a>
        <a href={resolve('/faq')}>Вопросы</a>
        <a href={resolve('/contact')}>Контакты</a>
      </nav>
    </header>
    {@render children()}
  </div>
  <footer class="site-footer">
    <p class="text-muted">Open Care v{import.meta.env.DEPLOY_VERSION}</p>
  </footer>
</div>
