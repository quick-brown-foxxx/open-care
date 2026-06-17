/**
 * Operator token state — memory-only, never persisted.
 *
 * Rules (from docs/specs/12-operator-frontend-ux.md §"Auth UX and token storage policy"):
 * - Token stored in browser memory only (Svelte 5 `$state`)
 * - Never localStorage, sessionStorage, IndexedDB, cookies, URL params, or logs
 * - Cleared on reload, tab close, explicit logout, 401 response, and idle timeout (30 min)
 * - Never shown after entry; no copy-to-clipboard for token
 */

/** Idle timeout in milliseconds (30 minutes). */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

let tokenValue = $state<string | null>(null);
let idleTimer: ReturnType<typeof setTimeout> | null = null;

/** Reset the idle timer. Call on any user interaction. */
function resetIdleTimer(): void {
  if (idleTimer !== null) clearTimeout(idleTimer);
  if (tokenValue !== null) {
    idleTimer = setTimeout(clearToken, IDLE_TIMEOUT_MS);
  }
}

/** Set the operator token in memory and start the idle timer. */
export function setToken(token: string): void {
  tokenValue = token;
  resetIdleTimer();
}

/** Clear the operator token from memory and stop the idle timer. */
export function clearToken(): void {
  tokenValue = null;
  if (idleTimer !== null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/** Whether a token is currently held in memory. */
export function hasToken(): boolean {
  return tokenValue !== null;
}

/** Get the current token value (or null). */
export function getToken(): string | null {
  return tokenValue;
}

/**
 * Get the Authorization header value for fetch calls.
 * Returns null when no token is set.
 */
export function authHeader(): string | null {
  if (tokenValue === null) return null;
  return `Bearer ${tokenValue}`;
}

/**
 * Call on any user interaction (click, keypress, scroll) to reset the idle timer.
 * Attach to document-level events in the admin layout.
 */
export function onUserActivity(): void {
  resetIdleTimer();
}
