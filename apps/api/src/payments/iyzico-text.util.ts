import { money } from '../common/utils/money.util';
import type { Prisma } from '@prisma/client';

/** iyzico alanlarında kontrol karakteri / aşırı uzunluk JSON hatalarına yol açabilir. */
export function sanitizeIyzicoText(value: string, maxLen = 128): string {
  const cleaned = value
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex -- iyzico JSON güvenliği için kontrol karakterlerini temizle
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u201C|\u201D|\u00AB|\u00BB/g, '"')
    .replace(/\u2018|\u2019|`|\u00B4/g, "'")
    .replace(/\u2026/g, '...')
    .replace(/\u200D/g, '')
    .replace(/\uFE0F/g, '')
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Urun';
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

/** iyzipay SDK formatPrice ile uyumlu; toplam tutarlar sepet satırlarıyla eşleşmeli. */
export function formatIyzicoMoney(value: Prisma.Decimal | string | number): string {
  return money.round(value).toFixed(2);
}

export function friendlyIyzicoInitError(raw: string | undefined): string {
  const msg = raw?.trim() ?? '';
  if (!msg) return 'Ödeme formu başlatılamadı. Lütfen tekrar deneyin.';
  if (/unexpected token|not valid json|bad control character/i.test(msg)) {
    return 'Ödeme sağlayıcısı geçici olarak yanıt veremedi. Lütfen birkaç saniye sonra tekrar deneyin.';
  }
  return msg;
}
