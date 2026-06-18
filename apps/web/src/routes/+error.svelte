<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>{page.status ? `Ошибка ${page.status}` : 'Ошибка'} — Открытый фонд помощи</title>
</svelte:head>

<div style="text-align: center; padding: 4rem 0;">
  <h1>{page.status ? `Ошибка ${page.status}` : 'Произошла ошибка'}</h1>
  <p class="lead">Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу.</p>
  <div class="cta">
    <a href={resolve('/')} class="btn primary">На главную</a>
    <a href={resolve('/contact')} class="btn">Сообщить о проблеме</a>
  </div>
</div>
