import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('landing page renders hero and feed', async ({ page }) => {
    await page.goto('/');
    // Hero section
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.kicker')).toBeVisible();
    // Metrics section
    await expect(page.locator('.metrics')).toBeVisible();
    // Feed container
    await expect(page.locator('.feed')).toBeVisible();
    // Brand mark
    await expect(page.locator('.mark')).toBeVisible();
    // CTA buttons
    await expect(page.locator('.cta')).toBeVisible();
  });

  test('about page renders content', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toBeVisible();
    // Should contain "ручной цикл конвертации" (manual conversion loop)
    await expect(page.getByText(/ручной цикл конвертации/i)).toBeVisible();
  });

  test('faq page renders content', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('h1')).toBeVisible();
    // Should contain "честное ограничение" (honest limits)
    await expect(page.getByText(/честное ограничение/i)).toBeVisible();
  });

  test('contact page renders content', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toBeVisible();
    // Should have contact method / GitHub link
    await expect(page.getByRole('link', { name: /github/i })).toBeVisible();
  });

  test('donate page renders wallet info and QR', async ({ page }) => {
    await page.goto('/donate');
    await expect(page.locator('h1')).toBeVisible();
    // Wallet address should be visible (multiple <code> elements exist)
    await expect(page.locator('code').first()).toBeVisible();
    // QR code should render (as SVG img, not canvas)
    await expect(page.locator('img[alt*="QR-код"]')).toBeVisible();
    // Warnings should be present
    await expect(page.getByText(/Публичность/i)).toBeVisible();
  });

  test('ledger page renders filters and timeline', async ({ page }) => {
    await page.goto('/ledger');
    await expect(page.locator('h1')).toBeVisible();
    // Filter tabs should be visible
    await expect(page.getByRole('tab', { name: 'Все' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Пожертвования' })).toBeVisible();
    // Export link should be present
    await expect(page.getByText(/экспорт/i)).toBeVisible();
  });

  test('verify page renders structure', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.locator('h1')).toBeVisible();
    // Lead text should be visible
    await expect(page.getByText(/Независимая проверка целостности/i)).toBeVisible();
    // Page should render content cards (loading skeleton, error, or data)
    // At least one .standalone-card should be present
    await expect(page.locator('.standalone-card').first()).toBeVisible();
    // The page heading mentions HEAD (in data state) or shows loading/error
    // Verify the page is not blank
    const cardCount = await page.locator('.standalone-card').count();
    expect(cardCount).toBeGreaterThan(0);
  });
});
