import { expect, test } from '@playwright/test';
import { adminCredential } from './env';

test.describe('Admin panel', () => {
  test('seed admin reaches dashboard after login', async ({ page }) => {
    const { phone, password } = adminCredential();
    await page.goto('/login');

    await page.getByPlaceholder('905550000001').fill(phone);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /^Giriş yap$/ }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /^Özet$/ })).toBeVisible();
    await expect(page.getByText('Yönetim paneli', { exact: false })).toBeVisible();
  });
});
