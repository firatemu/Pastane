import { expect, test } from '@playwright/test';
import { courierCredential } from './env';

test.describe('smoke', () => {
  test('@smoke kurye teslimatların merkezi', async ({ page }) => {
    const { phone, password } = courierCredential();
    await page.goto('/login');

    await page.getByLabel(/telefon/i).fill(phone);
    await page.getByLabel(/^şifre$/i).fill(password);
    await page.getByRole('button', { name: /giriş yap/i }).click();

    await expect(page).toHaveURL(/\/deliveries/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /^Teslimatlar$/ })).toBeVisible();
  });
});
