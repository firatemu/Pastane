# Pastane & Fırın Platformu
# Backend Hata Kodları Standardı

---

# 1. Genel Hata Formatı

Tüm API hataları aşağıdaki formatta dönmelidir:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Ürün bulunamadı",
  "errorCode": "PRODUCT_NOT_FOUND",
  "errors": []
}
```

---

# 2. Hata Kodu İsimlendirme

Hata kodları büyük harf ve snake_case formatında olmalıdır.

```text
PRODUCT_NOT_FOUND
INSUFFICIENT_STOCK
PAYMENT_FAILED
```

---

# 3. Genel Hatalar

| Kod | HTTP | Açıklama |
|---|---:|---|
| VALIDATION_ERROR | 400 | DTO validasyon hatası |
| UNAUTHORIZED | 401 | Kullanıcı giriş yapmamış |
| FORBIDDEN | 403 | Yetki yok |
| NOT_FOUND | 404 | Kaynak bulunamadı |
| INTERNAL_SERVER_ERROR | 500 | Beklenmeyen sunucu hatası |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit aşıldı |

---

# 4. Auth Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| INVALID_CREDENTIALS | 401 | Telefon/e-posta veya şifre hatalı |
| USER_NOT_ACTIVE | 403 | Kullanıcı aktif değil |
| USER_BANNED | 403 | Kullanıcı engellenmiş |
| TOKEN_EXPIRED | 401 | Access token süresi dolmuş |
| REFRESH_TOKEN_INVALID | 401 | Refresh token geçersiz |
| REFRESH_TOKEN_REVOKED | 401 | Refresh token iptal edilmiş |
| PHONE_NOT_VERIFIED | 403 | Telefon doğrulanmamış |
| PASSWORD_TOO_WEAK | 400 | Şifre güvenli değil |

---

# 5. OTP Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| OTP_INVALID | 400 | OTP kodu yanlış |
| OTP_EXPIRED | 400 | OTP süresi dolmuş |
| OTP_ALREADY_USED | 400 | OTP daha önce kullanılmış |
| OTP_ATTEMPT_LIMIT_EXCEEDED | 429 | OTP deneme limiti aşıldı |
| OTP_SEND_FAILED | 500 | SMS gönderilemedi |
| OTP_DISABLED | 400 | OTP sistemi aktif değil |

---

# 6. Kullanıcı Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| USER_NOT_FOUND | 404 | Kullanıcı bulunamadı |
| PHONE_ALREADY_EXISTS | 409 | Telefon zaten kayıtlı |
| EMAIL_ALREADY_EXISTS | 409 | E-posta zaten kayıtlı |
| INVALID_USER_STATUS | 400 | Geçersiz kullanıcı durumu |

---

# 7. Ürün / Kategori Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| PRODUCT_NOT_FOUND | 404 | Ürün bulunamadı |
| PRODUCT_NOT_ACTIVE | 400 | Ürün satışta değil |
| PRODUCT_OUT_OF_STOCK | 400 | Ürün stokta yok |
| PRODUCT_SLUG_EXISTS | 409 | Ürün slug zaten kullanılıyor |
| CATEGORY_NOT_FOUND | 404 | Kategori bulunamadı |
| CATEGORY_HAS_PRODUCTS | 400 | Ürün bağlı kategori silinemez |
| CATEGORY_SLUG_EXISTS | 409 | Kategori slug zaten kullanılıyor |

---

# 8. Stok Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| STOCK_ENTRY_NOT_FOUND | 404 | Stok kaydı bulunamadı |
| INSUFFICIENT_STOCK | 400 | Yeterli stok yok |
| STOCK_WINDOW_NOT_ACTIVE | 400 | Ürün bu saat aralığında satışta değil |
| STOCK_ENTRY_ALREADY_EXISTS | 409 | Aynı ürün/tarih/saat için stok kaydı var |
| STOCK_RESERVATION_FAILED | 400 | Stok rezerve edilemedi |
| STOCK_RESERVATION_EXPIRED | 400 | Stok rezervasyon süresi doldu |

---

# 9. Sepet Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| CART_NOT_FOUND | 404 | Sepet bulunamadı |
| CART_ITEM_NOT_FOUND | 404 | Sepet kalemi bulunamadı |
| CART_EMPTY | 400 | Sepet boş |
| CART_ITEM_INVALID_OPTIONS | 400 | Ürün seçenekleri geçersiz |
| CART_ITEM_REQUIRED_OPTION_MISSING | 400 | Zorunlu seçenek eksik |

---

# 10. Sipariş Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| ORDER_NOT_FOUND | 404 | Sipariş bulunamadı |
| ORDER_ACCESS_DENIED | 403 | Bu siparişe erişim yok |
| ORDER_STATUS_INVALID | 400 | Sipariş durumu geçersiz |
| ORDER_STATUS_TRANSITION_INVALID | 400 | Geçersiz durum geçişi |
| ORDER_CANNOT_BE_CANCELLED | 400 | Sipariş iptal edilemez |
| ORDER_ALREADY_DELIVERED | 400 | Teslim edilmiş siparişte işlem yapılamaz |
| ORDER_ADDRESS_REQUIRED | 400 | Adrese teslim için adres zorunlu |
| ORDER_PICKUP_STORE_REQUIRED | 400 | Gel-al için mağaza seçimi zorunlu |
| ORDER_PAYMENT_REQUIRED | 400 | Sipariş için ödeme gerekli |

---

# 11. Ödeme Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| PAYMENT_NOT_FOUND | 404 | Ödeme bulunamadı |
| PAYMENT_FAILED | 400 | Ödeme başarısız |
| PAYMENT_ALREADY_COMPLETED | 400 | Ödeme zaten tamamlanmış |
| PAYMENT_AMOUNT_MISMATCH | 400 | Ödeme tutarı sipariş tutarıyla uyuşmuyor |
| PAYMENT_CALLBACK_INVALID | 400 | Callback doğrulaması başarısız |
| PAYMENT_PROVIDER_ERROR | 502 | İyzico sağlayıcı hatası |
| PAYMENT_REFUND_FAILED | 400 | İade işlemi başarısız |
| PAYMENT_TIMEOUT | 408 | Ödeme süresi doldu |

---

# 12. Kurye / Teslimat Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| COURIER_NOT_FOUND | 404 | Kurye bulunamadı |
| COURIER_NOT_ACTIVE | 400 | Kurye aktif değil |
| COURIER_ALREADY_ASSIGNED | 400 | Siparişe zaten kurye atanmış |
| DELIVERY_NOT_FOUND | 404 | Teslimat kaydı bulunamadı |
| DELIVERY_ACCESS_DENIED | 403 | Teslimata erişim yok |
| DELIVERY_STATUS_INVALID | 400 | Teslimat durumu geçersiz |
| DELIVERY_CANNOT_BE_UPDATED | 400 | Teslimat güncellenemez |

---

# 13. Sadakat Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| LOYALTY_ACCOUNT_NOT_FOUND | 404 | Sadakat hesabı bulunamadı |
| LOYALTY_DISABLED | 400 | Sadakat sistemi aktif değil |
| INSUFFICIENT_LOYALTY_POINTS | 400 | Yeterli puan yok |
| LOYALTY_QR_INVALID | 400 | QR kod geçersiz |
| LOYALTY_SETTINGS_NOT_FOUND | 404 | Sadakat ayarları bulunamadı |
| LOYALTY_MINIMUM_REDEEM_NOT_MET | 400 | Minimum puan kullanım şartı sağlanmadı |

---

# 14. Yorum Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| REVIEW_NOT_FOUND | 404 | Yorum bulunamadı |
| REVIEW_ALREADY_EXISTS | 409 | Bu sipariş ürünü için yorum yapılmış |
| REVIEW_ORDER_NOT_DELIVERED | 400 | Teslim edilmemiş siparişe yorum yapılamaz |
| REVIEW_RATING_INVALID | 400 | Puan 1-5 arasında olmalıdır |
| REVIEW_ACCESS_DENIED | 403 | Yoruma erişim yok |

---

# 15. Medya Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| MEDIA_NOT_FOUND | 404 | Medya bulunamadı |
| MEDIA_UPLOAD_FAILED | 500 | Dosya yükleme başarısız |
| MEDIA_DELETE_FAILED | 500 | Dosya silme başarısız |
| MEDIA_INVALID_TYPE | 400 | Dosya tipi desteklenmiyor |
| MEDIA_FILE_TOO_LARGE | 400 | Dosya boyutu fazla |

---

# 16. Ayar / Kampanya Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| SETTING_NOT_FOUND | 404 | Ayar bulunamadı |
| SETTING_INVALID_VALUE | 400 | Ayar değeri geçersiz |
| CAMPAIGN_NOT_FOUND | 404 | Kampanya bulunamadı |
| CAMPAIGN_NOT_ACTIVE | 400 | Kampanya aktif değil |
| CAMPAIGN_CONDITION_NOT_MET | 400 | Kampanya şartları sağlanmadı |

---

# 17. Bildirim Hataları

| Kod | HTTP | Açıklama |
|---|---:|---|
| NOTIFICATION_NOT_FOUND | 404 | Bildirim bulunamadı |
| NOTIFICATION_SEND_FAILED | 500 | Bildirim gönderilemedi |
| FCM_TOKEN_INVALID | 400 | FCM token geçersiz |

---

# 18. Kullanım Standardı

Backend servislerinde hata fırlatırken mümkün olduğunca özel hata kodu kullanılmalıdır.

Örnek:

```ts
throw new AppException(
  'Ürün stokta yok',
  'PRODUCT_OUT_OF_STOCK',
  HttpStatus.BAD_REQUEST
);
```

---

# 19. Özet

Bu standart sayesinde:

- frontend hataları doğru gösterebilir,
- mobil uygulama özel hata mesajları üretebilir,
- log analizleri kolaylaşır,
- Swagger dokümantasyonu daha anlaşılır olur.
