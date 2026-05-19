# Pastane & Fırın Platformu
# Backend API Endpoint Sözleşmesi

**Uygulama:** `apps/api`  
**Framework:** NestJS + TypeScript  
**Base URL:** `/api/v1`  
**Response Formatı:** Standart JSON wrapper

---

# 1. Genel API Standartları

## 1.1 Başarılı Response Formatı

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Liste endpointlerinde `meta` alanı kullanılacaktır.

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 1.2 Hata Response Formatı

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": []
}
```

---

## 1.3 Pagination Standardı

Liste endpointleri aşağıdaki query parametrelerini desteklemelidir:

```text
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

---

## 1.4 Auth Header

```http
Authorization: Bearer <access_token>
```

---

# 2. Health

| Method | Path | Açıklama | Auth |
|---|---|---|---|
| GET | `/health` | API, DB, Redis, MinIO sağlık kontrolü | Public |

---

# 3. Auth

| Method | Path | Açıklama | Auth |
|---|---|---|---|
| POST | `/auth/register` | Yeni müşteri kaydı | Public |
| POST | `/auth/login` | Telefon/e-posta + şifre ile giriş | Public |
| POST | `/auth/refresh` | Access token yenileme | Public |
| POST | `/auth/logout` | Refresh token iptal ederek çıkış | Auth |
| GET | `/auth/me` | Mevcut kullanıcı bilgisi | Auth |
| POST | `/auth/verify-phone` | OTP ile telefon doğrulama | Public/Auth |
| POST | `/auth/resend-otp` | OTP tekrar gönderme | Public/Auth |

---

## 3.1 POST /auth/register

### Request

```json
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "phone": "905551112233",
  "email": "ahmet@example.com",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "phone": "905551112233",
    "isPhoneVerified": false
  }
}
```

---

## 3.2 POST /auth/login

### Request

```json
{
  "identifier": "905551112233",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "refresh-token",
    "user": {
      "id": "uuid",
      "firstName": "Ahmet",
      "lastName": "Yılmaz",
      "role": "CUSTOMER"
    }
  }
}
```

---

# 4. Users

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/users` | Kullanıcı listesi | ADMIN |
| GET | `/users/:id` | Kullanıcı detayı | ADMIN |
| PATCH | `/users/profile` | Kendi profilini güncelleme | Auth |
| PATCH | `/users/password` | Şifre değiştirme | Auth |
| PATCH | `/users/:id/status` | Kullanıcı durumunu değiştirme | ADMIN |

---

# 5. Addresses

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/addresses` | Müşterinin adresleri | CUSTOMER |
| POST | `/addresses` | Adres ekleme | CUSTOMER |
| PATCH | `/addresses/:id` | Adres güncelleme | CUSTOMER |
| DELETE | `/addresses/:id` | Adres silme | CUSTOMER |
| PATCH | `/addresses/:id/default` | Varsayılan adres yapma | CUSTOMER |

---

# 6. Roles & Permissions

## Roles

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/roles` | Rol listesi | ADMIN |
| POST | `/roles` | Rol oluşturma | ADMIN |
| PATCH | `/roles/:id` | Rol güncelleme | ADMIN |
| DELETE | `/roles/:id` | Rol silme | ADMIN |
| GET | `/roles/:id/permissions` | Rol izinleri | ADMIN |
| POST | `/roles/:id/permissions` | Rol izni ekleme | ADMIN |
| DELETE | `/roles/:id/permissions/:permissionId` | Rol izni kaldırma | ADMIN |

## Permissions

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/permissions` | İzin listesi | ADMIN |
| POST | `/permissions` | İzin oluşturma | ADMIN |
| DELETE | `/permissions/:id` | İzin silme | ADMIN |

---

# 7. Categories

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/categories` | Kategori ağacı | Public |
| GET | `/categories/:id` | Kategori detayı | Public |
| POST | `/categories` | Kategori oluşturma | PRODUCT_MANAGER, ADMIN |
| PATCH | `/categories/:id` | Kategori güncelleme | PRODUCT_MANAGER, ADMIN |
| DELETE | `/categories/:id` | Kategori silme | ADMIN |

---

# 8. Products

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/products` | Ürün listesi | Public |
| GET | `/products/:id` | Ürün detayı | Public |
| GET | `/products/slug/:slug` | Slug ile ürün detayı | Public |
| POST | `/products` | Ürün oluşturma | PRODUCT_MANAGER, ADMIN |
| PATCH | `/products/:id` | Ürün güncelleme | PRODUCT_MANAGER, ADMIN |
| DELETE | `/products/:id` | Ürün silme | ADMIN |
| POST | `/products/:id/option-groups` | Özelleştirme grubu ekleme | PRODUCT_MANAGER, ADMIN |
| POST | `/products/:id/option-groups/:groupId/options` | Seçenek ekleme | PRODUCT_MANAGER, ADMIN |
| PATCH | `/products/:id/allergens` | Ürün alerjenlerini güncelleme | PRODUCT_MANAGER, ADMIN |

---

## 8.1 GET /products Query

```text
?page=1&limit=20&categoryId=uuid&status=ACTIVE&search=pasta&minPrice=100&maxPrice=500
```

---

# 9. Allergens

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/allergens` | Alerjen listesi | Public |
| POST | `/allergens` | Alerjen oluşturma | ADMIN |
| PATCH | `/allergens/:id` | Alerjen güncelleme | ADMIN |
| DELETE | `/allergens/:id` | Alerjen silme | ADMIN |

---

# 10. Media

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | `/media/upload` | Dosya/görsel yükleme | PRODUCT_MANAGER, ADMIN |
| GET | `/media/:id` | Medya detayı | PRODUCT_MANAGER, ADMIN |
| DELETE | `/media/:id` | Medya silme | PRODUCT_MANAGER, ADMIN |

---

# 11. Stock

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/stock` | Stok listesi | PRODUCT_MANAGER, ADMIN |
| GET | `/stock/product/:productId` | Ürün stok geçmişi | PRODUCT_MANAGER, ADMIN |
| POST | `/stock` | Stok girişi oluşturma | PRODUCT_MANAGER, ADMIN |
| PATCH | `/stock/:id` | Stok güncelleme | PRODUCT_MANAGER, ADMIN |
| POST | `/stock/:id/movements` | Stok hareketi oluşturma | PRODUCT_MANAGER, ADMIN |
| GET | `/stock/:id/movements` | Stok hareketleri | PRODUCT_MANAGER, ADMIN |

---

# 12. Stores

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/stores` | Aktif mağazalar | Public |
| GET | `/stores/:id` | Mağaza detayı | Public |
| POST | `/stores` | Mağaza oluşturma | ADMIN |
| PATCH | `/stores/:id` | Mağaza güncelleme | ADMIN |
| DELETE | `/stores/:id` | Mağaza silme | ADMIN |

---

# 13. Cart

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/cart` | Sepet içeriği | CUSTOMER |
| POST | `/cart/items` | Sepete ürün ekleme | CUSTOMER |
| PATCH | `/cart/items/:itemId` | Sepet kalemi güncelleme | CUSTOMER |
| DELETE | `/cart/items/:itemId` | Sepetten ürün çıkarma | CUSTOMER |
| DELETE | `/cart` | Sepeti temizleme | CUSTOMER |

---

# 14. Orders

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | `/orders` | Sipariş oluşturma | CUSTOMER |
| GET | `/orders` | Sipariş listesi | ORDER_OPERATOR, ADMIN |
| GET | `/orders/my` | Müşteri sipariş geçmişi | CUSTOMER |
| GET | `/orders/:id` | Sipariş detayı | Yetkili kullanıcı |
| PATCH | `/orders/:id/status` | Sipariş durumu güncelleme | ORDER_OPERATOR, ADMIN |
| POST | `/orders/:id/cancel` | Sipariş iptali | CUSTOMER, ADMIN |
| POST | `/orders/:id/assign-courier` | Kurye atama | ORDER_OPERATOR, ADMIN |

---

# 15. Payments

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | `/payments/initiate` | İyzico ödeme başlatma | CUSTOMER |
| POST | `/payments/callback` | İyzico callback/webhook | Public |
| GET | `/payments/:orderId` | Ödeme detayı | CUSTOMER, ADMIN |
| POST | `/payments/:id/refund` | İade başlatma | ADMIN |

---

# 16. Couriers

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/couriers` | Kurye listesi | ADMIN, ORDER_OPERATOR |
| GET | `/couriers/:id` | Kurye detayı | ADMIN |
| POST | `/couriers` | Kurye oluşturma | ADMIN |
| PATCH | `/couriers/:id` | Kurye güncelleme | ADMIN |
| GET | `/couriers/:id/deliveries` | Kurye teslimatları | ADMIN, ilgili kurye |
| GET | `/couriers/:id/performance` | Kurye performansı | ADMIN |

---

# 17. Deliveries

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/deliveries/my` | Kuryenin teslimatları | COURIER |
| PATCH | `/deliveries/:id/pickup` | Teslim alındı | COURIER |
| PATCH | `/deliveries/:id/delivered` | Teslim edildi | COURIER |
| PATCH | `/deliveries/:id/failed` | Teslim edilemedi | COURIER |

---

# 18. Delivery Zones

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/delivery-zones` | Aktif teslimat bölgeleri | Public |
| POST | `/delivery-zones` | Bölge oluşturma | ADMIN |
| PATCH | `/delivery-zones/:id` | Bölge güncelleme | ADMIN |
| DELETE | `/delivery-zones/:id` | Bölge silme | ADMIN |

---

# 19. Loyalty

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/loyalty/account` | Puan bakiyesi | CUSTOMER |
| GET | `/loyalty/account/movements` | Puan hareketleri | CUSTOMER |
| GET | `/loyalty/qr` | QR kod | CUSTOMER |
| POST | `/loyalty/scan` | QR okutma ile puan kazandırma | ADMIN, ORDER_OPERATOR |
| POST | `/loyalty/redeem` | Puan kullandırma | ADMIN, ORDER_OPERATOR |
| GET | `/loyalty/settings` | Sadakat ayarları | ADMIN |
| PATCH | `/loyalty/settings` | Sadakat ayarı güncelleme | ADMIN |

---

# 20. Reviews

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | `/reviews` | Ürün yorumu oluşturma | CUSTOMER |
| GET | `/reviews/product/:productId` | Ürün yorumları | Public |
| GET | `/reviews/pending` | Onay bekleyen yorumlar | ADMIN |
| PATCH | `/reviews/:id/approve` | Yorumu onayla | ADMIN |
| PATCH | `/reviews/:id/reject` | Yorumu reddet | ADMIN |
| DELETE | `/reviews/:id` | Yorumu sil | ADMIN |

---

# 21. Notifications

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/notifications/my` | Kullanıcı bildirimleri | Auth |
| PATCH | `/notifications/:id/read` | Bildirim okundu yap | Auth |
| PATCH | `/notifications/read-all` | Tüm bildirimleri okundu yap | Auth |

---

# 22. Campaigns

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/campaigns` | Aktif kampanyalar | Public |
| POST | `/campaigns` | Kampanya oluşturma | ADMIN |
| PATCH | `/campaigns/:id` | Kampanya güncelleme | ADMIN |
| DELETE | `/campaigns/:id` | Kampanya silme | ADMIN |

---

# 23. Settings

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/settings` | Sistem ayarları | ADMIN |
| PATCH | `/settings/:key` | Sistem ayarı güncelleme | ADMIN |

---

# 24. Reports

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/reports/sales/daily` | Günlük satış raporu | ADMIN |
| GET | `/reports/sales/products` | Ürün bazlı satış | ADMIN |
| GET | `/reports/sales/categories` | Kategori bazlı satış | ADMIN |
| GET | `/reports/products/top-selling` | En çok satan ürünler | ADMIN |
| GET | `/reports/couriers/performance` | Kurye performansı | ADMIN |
| GET | `/reports/customers/stats` | Müşteri istatistikleri | ADMIN |
| GET | `/reports/loyalty/usage` | Sadakat puanı raporu | ADMIN |

---

# 25. Audit

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | `/audit` | Audit log listesi | ADMIN |
| GET | `/audit/:id` | Audit log detayı | ADMIN |

---

# 26. Notlar

- Public endpointler haricinde JWT zorunludur.
- Admin ve operasyon endpointlerinde rol/yetki kontrolü yapılacaktır.
- Tüm endpointler Swagger/OpenAPI ile dokümante edilecektir.
- Liste endpointlerinde pagination varsayılan olarak aktif olacaktır.
