const { test: setup, expect } = require('@playwright/test');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/app');

  await page.fill('[name=email]', process.env.ADMIN_EMAIL);
  await page.fill('[name=password]', process.env.ADMIN_PASSWORD);
  await page.click('[type=submit]');

  await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });

  await page.context().storageState({ path: 'auth.json' });
});