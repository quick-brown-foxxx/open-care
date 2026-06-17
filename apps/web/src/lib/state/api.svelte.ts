/**
 * Reactive API data fetching helpers using Svelte 5 runes.
 *
 * Each function returns a reactive object with:
 * - `data` — the parsed response (null while loading/error)
 * - `error` — ApiError or null
 * - `loading` — boolean
 * - `refetch()` — re-trigger the fetch
 *
 * These are thin wrappers around the typed API client in `$lib/api/client.ts`.
 * They do NOT import from `$lib/components/` (surviving layer rule).
 */

import type { Result, ApiError } from '$lib/api/client.js';

/** Reactive state for a single async fetch. */
class FetchState<T> {
  data = $state<T | null>(null);
  error = $state<ApiError | null>(null);
  loading = $state<boolean>(false);

  private fetcher: () => Promise<Result<T>>;

  constructor(fetcher: () => Promise<Result<T>>) {
    this.fetcher = fetcher;
  }

  async refetch(): Promise<void> {
    this.loading = true;
    this.error = null;
    const result = await this.fetcher();
    if (result.ok) {
      this.data = result.value;
      this.error = null;
    } else {
      this.data = null;
      this.error = result.error;
    }
    this.loading = false;
  }
}

/**
 * Create a reactive fetch state that auto-fetches on creation.
 * Use in component setup (not inside $effect — the constructor triggers the fetch).
 */
export function createFetch<T>(fetcher: () => Promise<Result<T>>): FetchState<T> {
  const state = new FetchState<T>(fetcher);
  state.refetch();
  return state;
}

/**
 * Create a reactive fetch state that does NOT auto-fetch.
 * Call `refetch()` manually (e.g., on button click).
 */
export function createLazyFetch<T>(fetcher: () => Promise<Result<T>>): FetchState<T> {
  return new FetchState<T>(fetcher);
}
