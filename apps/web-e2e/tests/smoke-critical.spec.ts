import { expect, test } from '@playwright/test';
import { customerCredential } from './env';

test.describe('smoke', () => {
  test('@smoke müşteri: ödeme, adres ve sipariş akışı', async ({ page }) => {
    const { phone, password } = customerCredential();
    await page.goto('/giris');
    await page.getByPlaceholder('905XXXXXXXXX').fill(phone);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /^Giriş yap$/ }).click();

    await expect(page).toHaveURL(/\/hesabim/, { timeout: 30_000 });

    for (const rota of ['/odeme', '/adresler', '/siparisler'] as const) {
      const cevap = await page.goto(rota, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      expect(cevap?.ok(), `${rota} yanlış HTTP kodu`).toBeTruthy();
      await expect(page).toHaveURL(new RegExp(rota.slice(1)));
    }
  });
});
