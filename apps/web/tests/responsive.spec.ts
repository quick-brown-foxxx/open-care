import { test, expect } from '@playwright/test';

test.describe('Responsive layout', () => {
  test('mobile viewport (375px) adapts landing layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // Page should still render
    await expect(page.locator('h1')).toBeVisible();
    // Nav links may be hidden on mobile (CSS media query at 980px)
    // The .links nav may be hidden or simplified
    // At minimum, the brand mark should be visible
    await expect(page.locator('.mark')).toBeVisible();
    // Hero should be single column (not grid)
    const hero = page.locator('.hero');
    const display = await hero.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    // On mobile (<980px), hero becomes single column
    expect(display).not.toContain('fr');
  });

  test('tablet viewport (768px) renders content readably', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.metrics')).toBeVisible();
    // Content should be readable
    const h1FontSize = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseInt(h1FontSize)).toBeGreaterThan(20);
  });

  test('mobile ledger page is usable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ledger');
    await expect(page.locator('h1')).toBeVisible();
    // Filter tabs should still be accessible
    await expect(page.getByRole('tab', { name: 'Все' })).toBeVisible();
  });
});
