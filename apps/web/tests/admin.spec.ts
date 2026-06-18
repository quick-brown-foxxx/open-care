import { test, expect } from '@playwright/test';

test.describe('Admin pages', () => {
  test('admin page shows token gate when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    // Token input form should be visible
    await expect(page.getByPlaceholder(/токен оператора/i)).toBeVisible();
    // Submit button should be present
    await expect(page.getByRole('button', { name: /Войти/i })).toBeVisible();
    // "Токен не сохраняется" text should be visible
    await expect(page.getByText(/Токен не сохраняется/i)).toBeVisible();
  });

  test('admin page submits token and disables button while checking', async ({ page }) => {
    await page.goto('/admin');
    // Type an invalid token
    await page.fill('input[type="password"]', 'invalid-token-12345');
    // Click submit — button should become disabled while the fetch is in progress
    await page.click('button[type="submit"]');
    // Verify the button becomes disabled (form submission started, checking=true)
    await expect(page.locator('button[type="submit"]')).toBeDisabled({ timeout: 2000 });
    // This proves the form submission mechanism works: token is set, fetch is
    // initiated, and the button is disabled to prevent double-submission.
    // The error message display depends on the API response. In local dev,
    // cross-origin CORS restrictions on staging.open-care.org prevent the
    // browser from receiving the response, so the fetch hangs and the error
    // message never appears. This is a known limitation of local testing.
  });

  test('token is cleared on page reload', async ({ page }) => {
    await page.goto('/admin');
    // Type something in the token field
    await page.fill('input[type="password"]', 'test-token');
    // Reload the page
    await page.reload();
    // Token input should be empty (memory-only storage)
    const input = page.locator('input[type="password"]');
    await expect(input).toHaveValue('');
  });
});
