import { expect, test } from '@playwright/test';
import { courierCredential } from './env';

test.describe('Courier app', () => {
  test('seed courier reaches deliveries after login', async ({ page }) => {
    const { phone, password } = courierCredential();
    await page.goto('/login');

    await page.getByPlaceholder('905550000004').fill(phone);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /^Giriş yap$/ }).click();

    await expect(page).toHaveURL(/\/deliveries/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Teslimat Kontrol Merkezi/ })).toBeVisible();
  });
});
