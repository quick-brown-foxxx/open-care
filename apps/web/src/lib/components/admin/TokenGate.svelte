<script lang="ts">
  import { setToken, clearToken } from '$lib/state/token.svelte.js';
  import { getPendingRequests } from '$lib/api/operator.js';

  let token = $state('');
  let error = $state('');
  let checking = $state(false);

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!token.trim()) return;
    checking = true;
    error = '';

    // Set token temporarily and test with an authenticated endpoint
    setToken(token.trim());

    const result = await getPendingRequests();
    if (result.ok) {
      // Token is valid — TokenGate will hide itself via the layout
      checking = false;
    } else {
      // Clear token on failure (especially 401)
      clearToken();
      error = result.error.message;
      checking = false;
    }
  }
</script>

<div class="standalone-card token-gate">
  <h2>Вход для оператора</h2>
  <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.85rem;">
    Токен не сохраняется. При перезагрузке страницы потребуется ввести заново.
  </p>

  <form onsubmit={handleSubmit}>
    <input
      class="form-input"
      type="password"
      placeholder="Введите токен оператора"
      autocomplete="off"
      bind:value={token}
    />

    {#if error}
      <p class="form-error">{error}</p>
    {/if}

    <button class="btn primary" type="submit" disabled={checking || !token.trim()}>
      {checking ? 'Проверка...' : 'Войти'}
    </button>
  </form>
</div>

<style>
  .token-gate {
    max-width: 28rem;
    margin: 4rem auto;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
