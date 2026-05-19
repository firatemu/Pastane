"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ERROR = void 0;
exports.looksLikeGenericEnglish = looksLikeGenericEnglish;
exports.validationDetailsUserHint = validationDetailsUserHint;
exports.mapApiErrorToTurkish = mapApiErrorToTurkish;
exports.mapUnknownErrorToTurkish = mapUnknownErrorToTurkish;
exports.mapPayloadToTurkish = mapPayloadToTurkish;
const audience_overrides_1 = require("./audience-overrides");
const PHRASE_ENTRIES = [
    [/^\s*invalid credentials\s*$/i, 'Telefon numarası veya şifre hatalı.'],
    [/^\s*user already exists\s*$/i, 'Bu telefon veya e-posta zaten kullanılıyor.'],
    [/^\s*phone or email already in use\s*$/i, 'Bu telefon veya e-posta zaten kullanılıyor.'],
    [/^\s*current password is invalid\s*$/i, 'Mevcut şifre hatalı.'],
    [/^\s*validation failed\s*$/i, 'Girdiğiniz bilgileri kontrol edin.'],
    [/^\s*internal server error\s*$/i, 'Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.'],
    [/^\s*unauthorized\s*$/i, 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'],
    [/^\s*forbidden\s*$/i, 'Bu işlem için yetkiniz yok.'],
    [/you do not have permission/i, 'Bu işlem için yetkiniz yok.'],
    [/^\s*not found\s*$/i, 'Kayıt bulunamadı.'],
    [/cart is empty/i, 'Sepetiniz boş.'],
    [/order not found/i, 'Sipariş bulunamadı.'],
    [/delivery not found/i, 'Teslimat bulunamadı.'],
    [/address required/i, 'Teslimat için geçerli bir adres seçmelisiniz.'],
    [/pickup store required/i, 'Mağazadan teslim için mağaza seçmelisiniz.'],
    [/delivery zone not found/i, 'Seçtiğiniz adres için teslimat bölgesi bulunamadı.'],
    [/reservation expired/i, 'Stok ayırma süresi doldu. Sepetinizi güncelleyip tekrar deneyin.'],
    [/insufficient stock/i, 'Yeterli stok yok.'],
    [/insufficient loyalty points/i, 'Yetersiz puan.'],
    [/order not payable/i, 'Bu sipariş için ödeme başlatılamıyor.'],
    [/invalid status transition|status transition invalid/i, 'Bu teslimat için bu işlem yapılamaz.'],
    [/payment failed|payment declined/i, 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.'],
];
exports.DEFAULT_ERROR = {
    customer: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    admin: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    courier: 'İşlem tamamlanamadı.',
};
function looksLikeGenericEnglish(message) {
    return /\b(invalid|required|unauthorized|forbidden|not found|failed|error|must be|should not|cannot)\b/i.test(message);
}
function phraseMatch(message) {
    const trimmed = message.trim();
    for (const [re, tr] of PHRASE_ENTRIES) {
        if (re.test(trimmed))
            return tr;
    }
    return null;
}
/** Use non-English constraint lines from Nest `error.details` when present (class-validator, etc.). */
function validationDetailsUserHint(details) {
    if (!Array.isArray(details) || details.length === 0)
        return null;
    const out = [];
    for (const item of details) {
        if (typeof item === 'string') {
            const t = item.trim();
            if (!t)
                continue;
            if (/property\s+\S+\s+should\s+not\s+exist/i.test(t)) {
                out.push('Sayfayı yenileyip tekrar deneyin; sorun sürerse uygulama veya sunucu güncel olmayabilir.');
                continue;
            }
            if (!looksLikeGenericEnglish(t))
                out.push(t);
            continue;
        }
        if (item && typeof item === 'object' && 'constraints' in item) {
            const c = item.constraints;
            if (c) {
                for (const msg of Object.values(c)) {
                    if (typeof msg === 'string') {
                        const t = msg.trim();
                        if (!t)
                            continue;
                        if (/property\s+\S+\s+should\s+not\s+exist/i.test(t)) {
                            out.push('Sayfayı yenileyip tekrar deneyin; sorun sürerse uygulama veya sunucu güncel olmayabilir.');
                            continue;
                        }
                        if (!looksLikeGenericEnglish(t))
                            out.push(t);
                    }
                }
            }
        }
    }
    const uniq = [...new Set(out)];
    if (uniq.length === 0)
        return null;
    return uniq.slice(0, 4).join(' · ');
}
function statusFallback(status, audience, contextualFallback) {
    const base = contextualFallback ?? exports.DEFAULT_ERROR[audience];
    switch (status) {
        case 400:
            return 'Girdiğiniz bilgileri kontrol edin.';
        case 401:
            return audience === 'courier' ? 'Oturum süresi doldu. Tekrar giriş yapın.' : 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
        case 403:
            return 'Bu işlem için yetkiniz yok.';
        case 404:
            return audience === 'courier' ? 'Teslimat bulunamadı.' : 'Kayıt bulunamadı.';
        case 409:
            return audience === 'courier'
                ? 'İşlem çakıştı. Sayfayı yenileyin.'
                : 'Bu işlem çakışıyor. Lütfen bilgilerinizi kontrol edin.';
        case 422:
            return 'Girdiğiniz bilgileri kontrol edin.';
        case 502:
        case 503:
            return 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
        default:
            if (status >= 500)
                return 'Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.';
            return base;
    }
}
/**
 * Map Nest/BFF `error` shape + HTTP status to a single Turkish UI string.
 */
function mapApiErrorToTurkish(audience, status, error, contextualFallback) {
    const code = error?.code?.trim();
    if (code === 'VALIDATION_FAILED') {
        const hint = validationDetailsUserHint(error?.details);
        if (hint)
            return hint;
        const rawEarly = error?.message?.trim();
        if (rawEarly && !/^validation failed$/i.test(rawEarly)) {
            const byPhrase = phraseMatch(rawEarly);
            if (byPhrase)
                return byPhrase;
            if (!looksLikeGenericEnglish(rawEarly))
                return rawEarly;
        }
        return (0, audience_overrides_1.messageForCode)('VALIDATION_FAILED', audience) ?? statusFallback(status, audience, contextualFallback);
    }
    if (code?.startsWith('HTTP_')) {
        const fromCore = (0, audience_overrides_1.messageForCode)(code, audience);
        if (fromCore)
            return fromCore;
        const n = Number(code.replace(/^HTTP_/, ''));
        if (!Number.isNaN(n))
            return statusFallback(n, audience, contextualFallback);
    }
    if (code) {
        const mapped = (0, audience_overrides_1.messageForCode)(code, audience);
        if (mapped)
            return mapped;
    }
    const raw = error?.message?.trim();
    if (raw) {
        if (/^\s*request failed\s*$/i.test(raw)) {
            return contextualFallback ?? exports.DEFAULT_ERROR[audience];
        }
        const byPhrase = phraseMatch(raw);
        if (byPhrase)
            return byPhrase;
        if (looksLikeGenericEnglish(raw))
            return statusFallback(status, audience, contextualFallback);
        return raw;
    }
    return statusFallback(status, audience, contextualFallback);
}
/**
 * Map thrown client/network errors (e.g. `fetch` failures) to Turkish UI copy.
 */
function mapUnknownErrorToTurkish(audience, error, contextualFallback) {
    const fb = contextualFallback ?? exports.DEFAULT_ERROR[audience];
    if (!(error instanceof Error))
        return fb;
    const m = error.message.trim();
    if (!m)
        return fb;
    const byPhrase = phraseMatch(m);
    if (byPhrase)
        return byPhrase;
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) {
        return audience === 'courier'
            ? 'Bağlantı hatası. Lütfen tekrar deneyin.'
            : 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
    }
    if (audience === 'customer') {
        if (/^\s*api fetch failed/i.test(m))
            return 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
        if (/\bapi request failed\b/i.test(m))
            return fb;
        if (/products request failed/i.test(m))
            return 'Ürünler yüklenemedi. Lütfen tekrar deneyin.';
        if (/reviews request failed/i.test(m))
            return 'Yorumlar yüklenemedi. Lütfen tekrar deneyin.';
        if (/stores request failed/i.test(m))
            return 'Mağazalar yüklenemedi. Lütfen tekrar deneyin.';
        if (/delivery zones request failed/i.test(m))
            return 'Teslimat bölgeleri yüklenemedi. Lütfen tekrar deneyin.';
    }
    if (audience === 'admin' && /\bapi request failed\b/i.test(m))
        return fb;
    if (looksLikeGenericEnglish(m))
        return fb;
    return m;
}
function mapPayloadToTurkish(audience, status, payload, contextualFallback) {
    if (!payload)
        return statusFallback(status, audience, contextualFallback);
    if (payload.error) {
        return mapApiErrorToTurkish(audience, status, payload.error, contextualFallback);
    }
    if (payload.message) {
        return mapApiErrorToTurkish(audience, status, { message: payload.message }, contextualFallback);
    }
    return statusFallback(status, audience, contextualFallback);
}
//# sourceMappingURL=map-error.js.map