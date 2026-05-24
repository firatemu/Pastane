import { expect, test } from '@playwright/test';
import { adminCredential } from './env';

test.describe('smoke', () => {
  test('@smoke yönetim paneli yüklendi', async ({ page }) => {
    const { phone, password } = adminCredential();
    await page.goto('/login');

    await page.getByPlaceholder('905550000001').fill(phone);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /^Giriş yap$/ }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /^Özet$/ })).toBeVisible();
  });
});
