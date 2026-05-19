"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COURIER_OVERRIDES = exports.CUSTOMER_OVERRIDES = void 0;
exports.messageForCode = messageForCode;
const core_code_messages_1 = require("./core-code-messages");
const CORE_LOOKUP = core_code_messages_1.CORE_CODE_MESSAGES;
/** Customer web: friendlier / storefront-specific wording where it differs from admin core. */
exports.CUSTOMER_OVERRIDES = {
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
    STOCK_RESERVATION_EXPIRED: 'Stok ayırma süresi doldu. Sepetinizi güncelleyip tekrar deneyin.',
    INSUFFICIENT_STOCK: 'Yeterli stok yok.',
    INSUFFICIENT_LOYALTY_POINTS: 'Yetersiz puan.',
    LOYALTY_ACCOUNT_NOT_FOUND: 'Puan hesabı bulunamadı.',
    BANNER_NOT_FOUND: 'Kayıt bulunamadı.',
    ALLERGEN_NOT_FOUND: 'Alerjen bilgisi bulunamadı.',
};
/** Courier app: short, field-oriented copy. */
exports.COURIER_OVERRIDES = {
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
function messageForCode(code, audience) {
    const c = code.trim();
    if (!c)
        return undefined;
    if (audience === 'customer') {
        return exports.CUSTOMER_OVERRIDES[c] ?? CORE_LOOKUP[c];
    }
    if (audience === 'courier') {
        return exports.COURIER_OVERRIDES[c] ?? CORE_LOOKUP[c];
    }
    return CORE_LOOKUP[c];
}
//# sourceMappingURL=audience-overrides.js.map