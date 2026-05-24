import { expect, test } from '@playwright/test';
import { customerCredential } from './env';

test.describe('Web storefront', () => {
  test('home loads storefront content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.stitch-container').first()).toBeVisible({ timeout: 60_000 });
  });

  test('shop page reachable', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveURL(/\/shop/);
  });

  test('seed customer can sign in', async ({ page }) => {
    const { phone, password } = customerCredential();
    await page.goto('/giris');
    await page.getByPlaceholder('905XXXXXXXXX').fill(phone);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /^Giriş yap$/ }).click();

    await expect(page).toHaveURL(/\/hesabim/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Merhaba,/ })).toBeVisible();
  });
});
