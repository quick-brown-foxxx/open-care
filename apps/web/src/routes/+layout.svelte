<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="page">
  <div class="wrap">
    <header class="topline">
      <a href="/" class="brand">
        <span class="mark">◦</span>
        <span>Открытый фонд помощи</span>
      </a>
      <nav class="links" aria-label="Навигация">
        <a href="/donate">Помочь</a>
        <a href="/ledger">История</a>
        <a href="/verify">Проверить</a>
        <a href="/about">О проекте</a>
        <a href="/faq">Вопросы</a>
        <a href="/contact">Контакты</a>
      </nav>
    </header>
    {@render children()}
  </div>
</div>
