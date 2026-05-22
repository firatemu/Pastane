import { CORE_CODE_MESSAGES } from './core-code-messages';
import type { ApiAudience } from './types';

const CORE_LOOKUP: Record<string, string> = CORE_CODE_MESSAGES;

/** Customer web: friendlier / storefront-specific wording where it differs from admin core. */
export const CUSTOMER_OVERRIDES: Partial<Record<string, string>> = {
  AUTH_OTP_DISABLED: 'Şu an tek kullanımlık şifre girişi kullanılamıyor.',
  USER_ALREADY_EXISTS: 'Bu telefon veya e-posta ile kayıtlı bir hesap zaten var.',
  ROLE_NOT_FOUND: 'İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.',
  PERMISSION_NOT_FOUND: 'İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.',
  DELIVERY_ZONE_NOT_FOUND: 'Seçtiğiniz adres için teslimat bölgesi bulunamadı.',
  CART_ITEM_NOT_FOUND: 'Sepet satırı bulunamadı.',
  CART_EMPTY: 'Sepetiniz boş.',
  ORDER_ACCESS_DENIED: 'Bu siparişi görüntüleme yetkiniz yok.',
  ORDER_STATUS_TRANSITION_INVALID: 'Bu sipariş durumu için işlem yapılamıyor.',
  ORDER_ADDRESS_REQUIRED: 'Teslimat için geçerli bir adres seçmelisiniz.',
  ORDER_PICKUP_STORE_REQUIRED: 'Mağazadan teslim için mağaza seçmelisiniz.',
  ORDER_NOT_ASSIGNABLE: 'Bu sipariş atanamıyor.',
  COURIER_NOT_FOUND: 'Kayıt bulunamadı.',
  COURIER_HAS_ACTIVE_DELIVERIES: 'İşlem tamamlanamadı.',
  DELIVERY_ACCESS_DENIED: 'Bu teslimatı görüntüleme yetkiniz yok.',
  DELIVERY_STATUS_TRANSITION_INVALID: 'Teslimat durumu güncellenemedi.',
  REVIEW_ALREADY_EXISTS: 'Bu ürün için zaten bir yorumunuz var.',
  PAYMENT_AMOUNT_MISMATCH: 'Ödeme tutarı siparişle uyuşmuyor.',
  PRODUCT_NOT_AVAILABLE_FOR_SALE: 'Ürün tükendi veya şu an satışa kapalı.',
  INSUFFICIENT_LOYALTY_POINTS: 'Yetersiz puan.',
  LOYALTY_ACCOUNT_NOT_FOUND: 'Puan hesabı bulunamadı.',
  BANNER_NOT_FOUND: 'Kayıt bulunamadı.',
  ALLERGEN_NOT_FOUND: 'Alerjen bilgisi bulunamadı.',
};

/** Courier app: short, field-oriented copy. */
export const COURIER_OVERRIDES: Partial<Record<string, string>> = {
  AUTH_INVALID_CREDENTIALS: 'Telefon veya şifre hatalı.',
  AUTH_REFRESH_TOKEN_INVALID: 'Oturumunuz sona erdi. Tekrar giriş yapın.',
  AUTH_REFRESH_TOKEN_REVOKED: 'Oturumunuz sona erdi. Tekrar giriş yapın.',
  AUTH_OTP_DISABLED: 'OTP girişi kapalı.',
  AUTH_OTP_INVALID: 'Kod hatalı.',
  AUTH_OTP_EXPIRED: 'Kodun süresi doldu.',
  DELIVERY_NOT_FOUND: 'Teslimat bulunamadı.',
  DELIVERY_ACCESS_DENIED: 'Bu teslimata erişim yok.',
  DELIVERY_STATUS_TRANSITION_INVALID: 'Bu teslimat için bu işlem yapılamaz.',
  ORDER_STATUS_TRANSITION_INVALID: 'Sipariş bu işlem için uygun değil.',
  FORBIDDEN: 'Yetki yok.',
  VALIDATION_FAILED: 'Bilgileri kontrol edin.',
  INTERNAL_SERVER_ERROR: 'Sunucu hatası. Sonra deneyin.',
};

export function messageForCode(code: string, audience: ApiAudience): string | undefined {
  const c = code.trim();
  if (!c) return undefined;
  if (audience === 'customer') {
    return CUSTOMER_OVERRIDES[c] ?? CORE_LOOKUP[c];
  }
  if (audience === 'courier') {
    return COURIER_OVERRIDES[c] ?? CORE_LOOKUP[c];
  }
  return CORE_LOOKUP[c];
}
