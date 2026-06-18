# Implementation Plan: Epic 7 — Frontend Testing & Hardening

## Overview

Add automated test coverage (Playwright browser + Vitest component), security hardening (CSP), SSR data loading (+page.ts), version injection, `prefers-reduced-motion`, and visual verification. Epics 0-6 complete. Zero frontend tests currently.

## Architecture Decisions

1. **Playwright test directory**: Use `apps/web/tests/` (not `apps/web/e2e/`). Update root `playwright.config.ts` `testDir`.
2. **Playwright browsers**: Add firefox + webkit projects alongside existing chromium.
3. **Vitest component testing**: Use `@testing-library/svelte` for rendering. Install as devDep in `apps/web/package.json`.
4. **CSP**: Use `_headers` file in `apps/web/static/` — Cloudflare Pages native, no code changes needed.
5. **+page.ts load functions**: Create for `/`, `/verify`, `/ledger`. Use public API client (`src/lib/api/client.ts`). These run server-side on Cloudflare Pages (edge-rendered).
6. **Version injection**: Use Vite `define` to inject `DEPLOY_VERSION` at build time. Display in footer of `+layout.svelte`. Backend `health.ts` already reads `c.env.DEPLOY_VERSION ?? '0.1.0-dev'` — no change needed.
7. **prefers-reduced-motion**: Add to `app.css` after existing animations.
8. **Visual verification**: Playwright screenshot test comparing landing page against prototype key elements.

## Task List

### Phase 1: Foundation (Dependencies + Config)

- [ ] **Task 1.1**: Install dependencies in `apps/web/package.json`
  - Add `@testing-library/svelte` as devDependency
  - Add `@playwright/test` as devDependency (already in root, add to web for direct access)
  - Run `pnpm install`

- [ ] **Task 1.2**: Update Playwright config
  - Change `testDir` from `./apps/web/e2e` to `./apps/web/tests`
  - Add firefox and webkit projects
  - Add `screenshot: 'on'` to use config (for failure screenshots)
  - Keep webServer config as-is

### Checkpoint: Foundation

- [ ] `pnpm install` succeeds
- [ ] Playwright config is valid

### Phase 2: Slice 7.3 — Frontend Hardening

- [ ] **Task 2.1**: Add Content-Security-Policy via `_headers`
  - Create `apps/web/static/_headers` with CSP allowing SvelteKit inline scripts/styles, self-origin, staging API, data: images, Solscan
  - `frame-ancestors 'none'`

- [ ] **Task 2.2**: Add `prefers-reduced-motion` to `app.css`
  - Add `@media (prefers-reduced-motion: reduce)` block disabling all animations/transitions

- [ ] **Task 2.3**: Create `+page.ts` load functions for SSR data
  - `src/routes/+page.ts`: load `getTotals()` + `getLedgerEvents({limit:10})` + `getVerify()`
  - `src/routes/verify/+page.ts`: load `getVerify()`
  - `src/routes/ledger/+page.ts`: load `getLedgerEvents({limit:50})` + `getVerify()`
  - Each returns data as props; pages use `let { data } = $props()` instead of `createFetch`

- [ ] **Task 2.4**: Version injection
  - Add `define: { 'import.meta.env.DEPLOY_VERSION': JSON.stringify(process.env.DEPLOY_VERSION ?? '0.1.0-dev') }` to `apps/web/vite.config.ts`
  - Add version display in `+layout.svelte` footer

- [ ] **Task 2.5**: Visual verification Playwright test
  - Create `apps/web/tests/visual.spec.ts`
  - Screenshot landing page, verify key elements: hero text, metrics, feed container, brand mark, color scheme

### Checkpoint: Hardening

- [ ] `pnpm run check` passes
- [ ] `pnpm run build` succeeds
- [ ] CSP headers present in build output
- [ ] +page.ts data flows to pages

### Phase 3: Slice 7.2 — Vitest Component Tests

- [ ] **Task 3.1**: Timeline component tests
  - `src/lib/components/public/__tests__/TimelineEvent.test.ts`
  - `src/lib/components/public/__tests__/TimelineRail.test.ts`
  - `src/lib/components/public/__tests__/TimelineCard.test.ts`

- [ ] **Task 3.2**: Admin component tests
  - `src/lib/components/admin/__tests__/TokenGate.test.ts`
  - `src/lib/components/admin/__tests__/AdminNav.test.ts`

- [ ] **Task 3.3**: UI primitive tests
  - `src/lib/components/ui/__tests__/Button.test.ts`
  - `src/lib/components/ui/__tests__/Card.test.ts`
  - `src/lib/components/ui/__tests__/Badge.test.ts`

- [ ] **Task 3.4**: Public utility component tests
  - `src/lib/components/public/__tests__/HashDisplay.test.ts`
  - `src/lib/components/public/__tests__/SolscanLink.test.ts`
  - `src/lib/components/public/__tests__/CopyButton.test.ts`

### Checkpoint: Vitest

- [ ] `pnpm run test` includes new component tests and they pass
- [ ] All 11+ new test files pass

### Phase 4: Slice 7.1 — Playwright Browser Tests

- [ ] **Task 4.1**: Public page smoke tests
  - `apps/web/tests/public.spec.ts`
  - Tests for `/`, `/about`, `/faq`, `/contact`, `/donate`, `/ledger`, `/verify`

- [ ] **Task 4.2**: Admin page smoke tests
  - `apps/web/tests/admin.spec.ts`
  - Tests for `/admin` auth gate, invalid token, token cleared on reload

- [ ] **Task 4.3**: Responsive tests
  - `apps/web/tests/responsive.spec.ts`
  - Mobile (375px) and tablet (768px) viewport tests

- [ ] **Task 4.4**: Install Playwright browsers
  - `pnpm exec playwright install chromium firefox webkit`

### Checkpoint: Playwright

- [ ] `pnpm exec playwright test` passes (all browser tests)
- [ ] Screenshots captured on failure

### Phase 5: Final Verification

- [ ] `pnpm run final-check` — all 5 gates exit 0
- [ ] `pnpm run test` — all tests pass (existing 593 + new frontend)
- [ ] `pnpm run build` — SvelteKit build succeeds
- [ ] `pnpm exec playwright test` — all browser tests pass

## Risks and Mitigations

| Risk                                                         | Impact | Mitigation                                                                                                                           |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@testing-library/svelte` incompatible with Svelte 5 runes   | High   | Test immediately after install; fall back to manual `mount` from `svelte`                                                            |
| +page.ts load functions break existing client-side data flow | Med    | Pages must handle both SSR data (from load) and client-side refetch; use `$props()` for initial data, keep `createFetch` for refetch |
| CSP breaks SvelteKit HMR in dev                              | Low    | CSP only applies in production (Cloudflare Pages serves `_headers`); dev server unaffected                                           |
| Playwright tests need seed data in local D1                  | Med    | Tests may need mock API or local D1 with seed data; document requirement                                                             |
| Visual verification flaky due to font rendering differences  | Low    | Check structural elements (presence, layout), not pixel-perfect                                                                      |

## Open Questions

- Do local Playwright tests need a running local D1 + all Workers, or can they work against staging API?
  - **Decision**: Tests will use the local dev server. Pages that fetch data will show loading/error states if no local API. Smoke tests check page structure renders, not live data.
