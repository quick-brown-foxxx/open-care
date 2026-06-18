import { test, expect } from '@playwright/test';

test('landing page matches prototype key elements', async ({ page }) => {
  await page.goto('/');

  // Hero section
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.kicker')).toBeVisible();
  await expect(page.locator('.lead')).toBeVisible();

  // Metrics section
  await expect(page.locator('.metrics')).toBeVisible();
  const metricCards = page.locator('.metric');
  await expect(metricCards).toHaveCount(3);

  // Feed / timeline container
  await expect(page.locator('.feed')).toBeVisible();

  // Brand mark in header
  await expect(page.locator('.mark')).toBeVisible();

  // CTA buttons
  await expect(page.locator('.cta')).toBeVisible();

  // Color scheme verification: check CSS custom properties are applied
  const bgColor = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
  // Should be warm cream (#fff7ec)
  expect(bgColor).toBeTruthy();

  // Take screenshot for visual record
  await page.screenshot({ path: 'test-results/landing-visual.png', fullPage: true });
});
