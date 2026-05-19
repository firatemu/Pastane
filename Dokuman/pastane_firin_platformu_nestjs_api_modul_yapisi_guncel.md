# Pastane & Fırın Platformu
# NestJS API — Güncel Modül Yapısı ve Klasör Organizasyonu

**Uygulama:** `apps/api`  
**Framework:** NestJS + TypeScript  
**ORM:** Prisma (`packages/database`)  
**Veritabanı:** PostgreSQL

---

# 1. Genel Karar

Backend API uygulaması NestJS ile geliştirilecektir.

API uygulaması modüler yapıda olacaktır.

Her iş alanı ayrı bir NestJS modülü olarak organize edilecektir.

Bu yapı:

- bakım kolaylığı,
- test edilebilirlik,
- AI destekli geliştirme uyumu,
- yetkilendirme kontrolü,
- ölçeklenebilirlik,
- ekip çalışmasına uygunluk

sağlayacaktır.

---

# 2. Genel Klasör Yapısı

```text
apps/api/
│
├── src/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── addresses/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── otp/
│   │   ├── categories/
│   │   ├── products/
│   │   ├── allergens/
│   │   ├── media/
│   │   ├── stock/
│   │   ├── stores/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── couriers/
│   │   ├── deliveries/
│   │   ├── delivery-zones/
│   │   ├── loyalty/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   ├── campaigns/
│   │   ├── settings/
│   │   ├── reports/
│   │   └── audit/
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   ├── minio.config.ts
│   │   ├── fcm.config.ts
│   │   ├── iyzico.config.ts
│   │   └── sms.config.ts
│   │
│   ├── database/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── jobs/
│   │   ├── notification.processor.ts
│   │   ├── payment-timeout.processor.ts
│   │   └── stock-reservation.processor.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
├── .env
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

# 3. Ana Yapı Dosyaları

## 3.1 main.ts

Görevleri:

- NestJS uygulamasını başlatır
- global prefix tanımlar: `/api/v1`
- Swagger/OpenAPI dokümantasyonunu açar
- Global ValidationPipe tanımlar
- CORS ayarlarını yapar
- global exception filter tanımlar
- response interceptor tanımlar

---

## 3.2 app.module.ts

Görevleri:

- tüm modülleri import eder
- ConfigModule global çalışır
- PrismaModule global çalışır
- ThrottlerModule rate limiting için kullanılır
- Redis / BullMQ queue altyapısı tanımlanır
- CacheModule yapılandırılır

---

## 3.3 prisma.service.ts

Görevleri:

- PrismaClient'ı extend eder
- uygulama başlangıcında veritabanı bağlantısı kurar
- uygulama kapanışında bağlantıyı kapatır
- tüm modüllere inject edilebilir yapı sağlar

---

# 4. Güncel Modül Listesi

| # | Modül | Sorumluluk |
|---|---|---|
| 1 | auth | JWT, login, register, refresh token, logout |
| 2 | users | Kullanıcı CRUD ve profil yönetimi |
| 3 | addresses | Müşteri adres yönetimi |
| 4 | roles | Rol tanımları |
| 5 | permissions | Modül/aksiyon bazlı izinler |
| 6 | otp | OTP üretimi, SMS doğrulama |
| 7 | categories | Kategori CRUD, hiyerarşik kategori |
| 8 | products | Ürün CRUD, ürün özelleştirme |
| 9 | allergens | Alerjen tanımları |
| 10 | media | MinIO dosya yükleme, görsel yönetimi |
| 11 | stock | Günlük/saatlik stok ve stok hareketleri |
| 12 | stores | Mağaza/şube, gel-al sistemi |
| 13 | cart | Sepet yönetimi |
| 14 | orders | Sipariş oluşturma ve durum yönetimi |
| 15 | payments | İyzico ödeme entegrasyonu |
| 16 | couriers | Kurye yönetimi ve atama |
| 17 | deliveries | Teslimat takibi |
| 18 | delivery-zones | Teslimat bölgesi ve ücretleri |
| 19 | loyalty | Sadakat puanı ve QR sistemi |
| 20 | reviews | Ürün yorum ve puanlama |
| 21 | notifications | Push, SMS, e-posta bildirimleri |
| 22 | campaigns | Kampanya ve indirim altyapısı |
| 23 | settings | Sistem genel ayarları |
| 24 | reports | Satış, ürün, kurye, müşteri raporları |
| 25 | audit | Sistem değişiklik kayıtları |

---

# 5. Standart Modül İç Yapısı

Her modül temel olarak aşağıdaki yapıda olacaktır:

```text
modules/[module-name]/
├── [module-name].module.ts
├── [module-name].controller.ts
├── [module-name].service.ts
├── dto/
│   ├── create-[module-name].dto.ts
│   ├── update-[module-name].dto.ts
│   └── query-[module-name].dto.ts
├── entities/                  # Gerekirse domain entity veya mapper yapıları
├── guards/                    # Modüle özel guard gerekiyorsa
├── providers/                 # Dış servis sağlayıcıları gerekiyorsa
└── [module-name].types.ts     # Opsiyonel tipler
```

---

# 6. Modül Detayları

---

## 6.1 auth

Kimlik doğrulama ve oturum yönetiminden sorumludur.

```text
modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── jwt-refresh.strategy.ts
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    ├── refresh-token.dto.ts
    └── logout.dto.ts
```

Endpointler:

| Method | Path | Açıklama |
|---|---|---|
| POST | /auth/register | Yeni üyelik |
| POST | /auth/login | Giriş |
| POST | /auth/refresh | Token yenileme |
| POST | /auth/logout | Çıkış |
| GET | /auth/me | Mevcut kullanıcı bilgisi |

Sorumluluklar:

- şifre hashleme
- access token üretimi
- refresh token üretimi
- refresh token DB kaydı
- logout sırasında refresh token revoke
- çoklu cihaz oturum desteği

---

## 6.2 users

Kullanıcı profil işlemlerinden sorumludur.

```text
modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
└── dto/
    ├── update-profile.dto.ts
    ├── change-password.dto.ts
    └── query-user.dto.ts
```

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /users | Kullanıcı listesi | ADMIN |
| GET | /users/:id | Kullanıcı detayı | ADMIN |
| PATCH | /users/profile | Profil güncelleme | Auth |
| PATCH | /users/password | Şifre değiştirme | Auth |
| PATCH | /users/:id/status | Kullanıcı durumu değiştirme | ADMIN |

---

## 6.3 addresses

Adres yönetimi ayrı modül olarak tasarlanmıştır.

```text
modules/addresses/
├── addresses.module.ts
├── addresses.controller.ts
├── addresses.service.ts
└── dto/
    ├── create-address.dto.ts
    ├── update-address.dto.ts
    └── query-address.dto.ts
```

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /addresses | Kullanıcının adresleri | CUSTOMER |
| POST | /addresses | Adres ekleme | CUSTOMER |
| PATCH | /addresses/:id | Adres güncelleme | CUSTOMER |
| DELETE | /addresses/:id | Adres silme | CUSTOMER |
| PATCH | /addresses/:id/default | Varsayılan adres yapma | CUSTOMER |

Sorumluluklar:

- kullanıcının birden fazla adresini yönetmek
- varsayılan adres kontrolü
- sipariş anında adres snapshot için orders modülüne veri sağlamak

---

## 6.4 roles

Rol tanımları ve rol-izin ilişkilerinden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /roles | Rol listesi | ADMIN |
| POST | /roles | Rol oluşturma | ADMIN |
| PATCH | /roles/:id | Rol güncelleme | ADMIN |
| DELETE | /roles/:id | Rol silme | ADMIN |
| GET | /roles/:id/permissions | Rol izinleri | ADMIN |
| POST | /roles/:id/permissions | İzin atama | ADMIN |
| DELETE | /roles/:id/permissions/:permissionId | İzin kaldırma | ADMIN |

---

## 6.5 permissions

Modül ve aksiyon bazlı yetkileri yönetir.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /permissions | İzin listesi | ADMIN |
| POST | /permissions | İzin oluşturma | ADMIN |
| DELETE | /permissions/:id | İzin silme | ADMIN |

---

## 6.6 otp

OTP üretimi, doğrulama ve SMS sağlayıcı entegrasyonundan sorumludur.

```text
modules/otp/
├── otp.module.ts
├── otp.service.ts
└── providers/
    └── sms.provider.ts
```

Not:

İlk aşamada controller olmayabilir. Auth ve users modülleri tarafından dahili servis olarak kullanılabilir.

Sorumluluklar:

- 6 haneli OTP üretimi
- kodu hashleyerek saklama
- deneme sayısı kontrolü
- süre kontrolü
- SMS gönderimi
- MVP'de pasif, prod ortamında aktif çalışma

---

## 6.7 categories

Kategori CRUD ve hiyerarşik kategori yönetiminden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /categories | Kategori ağacı | Public |
| GET | /categories/:id | Kategori detayı | Public |
| POST | /categories | Kategori oluşturma | PRODUCT_MANAGER, ADMIN |
| PATCH | /categories/:id | Kategori güncelleme | PRODUCT_MANAGER, ADMIN |
| DELETE | /categories/:id | Kategori silme | ADMIN |

Sorumluluklar:

- parent/child kategori yapısı
- slug üretimi
- kategoriye bağlı ürün varsa silme engeli

---

## 6.8 products

Ürün yönetimi ve ürün özelleştirmelerinden sorumludur.

```text
modules/products/
├── products.module.ts
├── products.controller.ts
├── products.service.ts
└── dto/
    ├── create-product.dto.ts
    ├── update-product.dto.ts
    ├── query-product.dto.ts
    ├── create-option-group.dto.ts
    └── create-option.dto.ts
```

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /products | Ürün listesi | Public |
| GET | /products/:id | Ürün detayı | Public |
| GET | /products/slug/:slug | Slug ile ürün detayı | Public |
| POST | /products | Ürün oluşturma | PRODUCT_MANAGER, ADMIN |
| PATCH | /products/:id | Ürün güncelleme | PRODUCT_MANAGER, ADMIN |
| DELETE | /products/:id | Ürün silme | ADMIN |
| POST | /products/:id/option-groups | Özelleştirme grubu ekleme | PRODUCT_MANAGER, ADMIN |
| POST | /products/:id/option-groups/:groupId/options | Seçenek ekleme | PRODUCT_MANAGER, ADMIN |
| PATCH | /products/:id/allergens | Alerjen güncelleme | PRODUCT_MANAGER, ADMIN |

Not:

Görsel yükleme işlemleri `media` modülü üzerinden yapılacaktır.

Products modülü sadece ürün-görsel ilişki kayıtlarını yönetebilir.

---

## 6.9 allergens

Alerjen master verilerinden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /allergens | Alerjen listesi | Public |
| POST | /allergens | Alerjen oluşturma | ADMIN |
| PATCH | /allergens/:id | Alerjen güncelleme | ADMIN |
| DELETE | /allergens/:id | Alerjen silme | ADMIN |

---

## 6.10 media

MinIO dosya yönetimi, ürün görselleri ve medya işlemlerinden sorumludur.

```text
modules/media/
├── media.module.ts
├── media.controller.ts
├── media.service.ts
├── providers/
│   └── minio.provider.ts
└── dto/
    ├── upload-media.dto.ts
    └── query-media.dto.ts
```

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | /media/upload | Dosya yükleme | PRODUCT_MANAGER, ADMIN |
| DELETE | /media/:id | Dosya silme | PRODUCT_MANAGER, ADMIN |
| GET | /media/:id | Dosya detayı | PRODUCT_MANAGER, ADMIN |

Sorumluluklar:

- MinIO bucket yönetimi
- ürün görseli yükleme
- WebP dönüşümü
- görsel resize/optimize işlemleri
- mime type kontrolü
- dosya boyutu kontrolü
- dosya metadata kaydı

---

## 6.11 stock

Günlük/saatlik stok ve stok hareketlerinden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /stock | Stok listesi | PRODUCT_MANAGER, ADMIN |
| GET | /stock/product/:productId | Ürün stok geçmişi | PRODUCT_MANAGER, ADMIN |
| POST | /stock | Stok girişi oluşturma | PRODUCT_MANAGER, ADMIN |
| PATCH | /stock/:id | Stok güncelleme | PRODUCT_MANAGER, ADMIN |
| POST | /stock/:id/movements | Stok hareketi ekleme | PRODUCT_MANAGER, ADMIN |
| GET | /stock/:id/movements | Stok hareketleri | PRODUCT_MANAGER, ADMIN |

Sorumluluklar:

- aynı ürün + tarih + saat penceresi için unique kontrol
- stok görünürlük hesabı
- stok hareket geçmişi
- stok sıfırlandığında ürünü OUT_OF_STOCK yapma
- yeniden stok girildiğinde ürünü ACTIVE yapma
- sipariş/ödeme akışında stok rezervasyon mantığına destek verme

---

## 6.12 stores

Mağaza/şube ve gel-al sistemi yönetiminden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /stores | Aktif mağazalar | Public |
| GET | /stores/:id | Mağaza detayı | Public |
| POST | /stores | Mağaza oluşturma | ADMIN |
| PATCH | /stores/:id | Mağaza güncelleme | ADMIN |
| DELETE | /stores/:id | Mağaza silme | ADMIN |

Sorumluluklar:

- mağaza bilgileri
- çalışma saatleri
- mağaza açık/kapalı kontrolü
- gel-al sipariş mağaza seçimi

---

## 6.13 cart

Sepet yönetiminden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /cart | Sepet içeriği | CUSTOMER |
| POST | /cart/items | Ürün ekleme | CUSTOMER |
| PATCH | /cart/items/:itemId | Sepet kalemi güncelleme | CUSTOMER |
| DELETE | /cart/items/:itemId | Ürün çıkarma | CUSTOMER |
| DELETE | /cart | Sepeti temizleme | CUSTOMER |

Sorumluluklar:

- kullanıcı başına tek aktif sepet
- ürün fiyat snapshot
- ürün özelleştirme seçenekleri
- stok kontrolü
- sepet toplamı hesaplama

---

## 6.14 orders

Sipariş oluşturma ve sipariş operasyonundan sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | /orders | Sipariş oluşturma | CUSTOMER |
| GET | /orders | Sipariş listesi | ORDER_OPERATOR, ADMIN |
| GET | /orders/my | Müşteri sipariş geçmişi | CUSTOMER |
| GET | /orders/:id | Sipariş detayı | Yetkili kullanıcı |
| PATCH | /orders/:id/status | Durum güncelleme | ORDER_OPERATOR, ADMIN |
| POST | /orders/:id/cancel | Sipariş iptali | CUSTOMER, ADMIN |
| POST | /orders/:id/assign-courier | Kurye atama | ORDER_OPERATOR, ADMIN |

Sorumluluklar:

- sepetten sipariş oluşturma
- ürün/fiyat/adres snapshot alma
- orderNumber üretme
- teslimat türü kontrolü
- gel-al mağaza kontrolü
- planlı teslim/teslim alma saatini yönetme
- sipariş durum geçmişi oluşturma
- durum geçiş validasyonu
- sadakat puanı kullanımını yönetme
- bildirim tetikleme

---

## 6.15 payments

İyzico ödeme entegrasyonundan sorumludur.

```text
modules/payments/
├── payments.module.ts
├── payments.controller.ts
├── payments.service.ts
├── providers/
│   └── iyzico.provider.ts
└── dto/
    ├── initiate-payment.dto.ts
    ├── payment-callback.dto.ts
    └── refund-payment.dto.ts
```

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | /payments/initiate | Ödeme başlatma | CUSTOMER |
| POST | /payments/callback | İyzico webhook/callback | Public |
| GET | /payments/:orderId | Ödeme detayı | CUSTOMER, ADMIN |
| POST | /payments/:id/refund | İade başlatma | ADMIN |

Sorumluluklar:

- İyzico ödeme başlatma
- 3D Secure akışı
- callback/webhook doğrulama
- ödeme sonucu işleme
- iade işlemleri
- ödeme response JSON kaydı

---

# 7. Ödeme ve Stok Akışı Kararı

Bu proje için ödeme ve stok akışı özellikle kritik olacaktır.

## 7.1 Temel Karar

Ödeme başarılı olmadan stok kesin olarak düşülmemelidir.

Bunun yerine ödeme başlatıldığında stok kısa süreli rezerve edilmelidir.

---

## 7.2 Önerilen Akış

```text
1. Müşteri sepeti oluşturur
2. Ödeme başlatılır
3. Stok uygunluğu kontrol edilir
4. Stok kısa süreli rezerve edilir
5. İyzico ödeme süreci başlar
6. Ödeme başarılıysa:
   - sipariş CONFIRMED olur
   - stok kesin düşülür
   - rezervasyon kapanır
   - bildirim gönderilir
7. Ödeme başarısızsa:
   - rezervasyon iptal edilir
   - sipariş iptal edilir veya ödeme bekliyor olarak kalır
8. Ödeme süresi dolarsa:
   - rezervasyon otomatik serbest bırakılır
```

---

## 7.3 İleri Seviye Öneri

İleride `stock_reservations` tablosu eklenebilir.

Bu tablo:

- ödeme sürecinde stok kilitleme,
- yoğun sipariş anlarında stok çakışmasını önleme,
- başarısız ödemelerde stok iadesi

için kullanılabilir.

---

## 7.4 İşlem Güvenliği

Sipariş, ödeme, stok ve sadakat işlemleri mümkün olduğunca transaction içerisinde ele alınmalıdır.

Özellikle şu işlemler atomik olmalıdır:

- sipariş oluşturma
- stok rezervasyonu
- ödeme sonucu işleme
- sadakat puanı düşümü
- stok kesin düşümü

---

## 6.16 couriers

Kurye yönetimi ve sipariş atamadan sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /couriers | Kurye listesi | ADMIN, ORDER_OPERATOR |
| GET | /couriers/:id | Kurye detayı | ADMIN |
| POST | /couriers | Kurye oluşturma | ADMIN |
| PATCH | /couriers/:id | Kurye güncelleme | ADMIN |
| GET | /couriers/:id/deliveries | Kurye teslimatları | ADMIN, ilgili kurye |
| GET | /couriers/:id/performance | Kurye performansı | ADMIN |

---

## 6.17 deliveries

Teslimat takibinden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /deliveries/my | Kuryenin teslimatları | COURIER |
| PATCH | /deliveries/:id/pickup | Teslim alındı | COURIER |
| PATCH | /deliveries/:id/delivered | Teslim edildi | COURIER |
| PATCH | /deliveries/:id/failed | Teslim edilemedi | COURIER |

Sorumluluklar:

- teslimat durum güncelleme
- order.status senkronizasyonu
- teslimat zamanı kaydetme
- teslim edilemedi nedeni
- teslimat sonrası bildirim

---

## 6.18 delivery-zones

Teslimat bölgeleri ve ücretlerinden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /delivery-zones | Aktif bölgeler | Public |
| POST | /delivery-zones | Bölge oluşturma | ADMIN |
| PATCH | /delivery-zones/:id | Bölge güncelleme | ADMIN |
| DELETE | /delivery-zones/:id | Bölge silme | ADMIN |

Sorumluluklar:

- bölge bazlı minimum sipariş tutarı
- bölge bazlı teslimat ücreti
- tahmini teslimat süresi
- aktif/pasif bölge kontrolü

---

## 6.19 loyalty

Sadakat puanı ve QR sisteminden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /loyalty/account | Puan bakiyesi | CUSTOMER |
| GET | /loyalty/account/movements | Puan hareketleri | CUSTOMER |
| GET | /loyalty/qr | QR kod | CUSTOMER |
| POST | /loyalty/scan | QR okutma | ADMIN, ORDER_OPERATOR |
| POST | /loyalty/redeem | Puan kullanma | ADMIN, ORDER_OPERATOR |
| GET | /loyalty/settings | Sadakat ayarları | ADMIN |
| PATCH | /loyalty/settings | Ayar güncelleme | ADMIN |

Sorumluluklar:

- QR kod ile müşteri bulma
- mağaza içi puan kazanımı
- online puan kazanımı
- puan kullanımı
- balanceAfter snapshot
- loyalty settings yönetimi

---

## 6.20 reviews

Ürün yorum ve puanlama sisteminden sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| POST | /reviews | Yorum oluşturma | CUSTOMER |
| GET | /reviews/product/:productId | Ürün yorumları | Public |
| GET | /reviews/pending | Bekleyen yorumlar | ADMIN |
| PATCH | /reviews/:id/approve | Yorum onaylama | ADMIN |
| PATCH | /reviews/:id/reject | Yorum reddetme | ADMIN |
| DELETE | /reviews/:id | Yorum silme | ADMIN |

Sorumluluklar:

- sadece teslim edilmiş sipariş ürünlerine yorum izni
- her orderItem için tek yorum
- rating 1-5 kontrolü
- admin onay akışı
- ürün ortalama puanı hesaplama

---

## 6.21 notifications

Push, SMS ve e-posta bildirimlerinden sorumludur.

```text
modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── providers/
│   ├── fcm.provider.ts
│   ├── sms.provider.ts
│   └── email.provider.ts
└── dto/
    └── send-notification.dto.ts
```

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /notifications/my | Bildirim listesi | CUSTOMER |
| PATCH | /notifications/:id/read | Okundu işareti | CUSTOMER |
| PATCH | /notifications/read-all | Tümünü okundu yap | CUSTOMER |

Sorumluluklar:

- FCM push notification
- SMS bildirimi
- e-posta bildirimi
- in-app notification kaydı
- notification queue yönetimi

---

# 8. Bildirim Queue Kararı

Bildirimler doğrudan request içerisinde gönderilmemelidir.

Bunun yerine Redis/BullMQ queue üzerinden gönderilmelidir.

## Sebep

- request süresini kısaltır
- SMS/e-posta sağlayıcı hatalarında sistemi kilitlemez
- tekrar deneme yapılabilir
- yoğun kampanya bildirimlerinde sistemi rahatlatır

## Önerilen Queue İşleri

```text
send-push-notification
send-sms
send-email
order-status-notification
campaign-notification
```

---

## 6.22 campaigns

Kampanya ve indirim altyapısından sorumludur.

Bu modül MVP'de pasif veya sınırlı olabilir ancak şimdiden ayrı modül olarak planlanmalıdır.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /campaigns | Aktif kampanyalar | Public |
| POST | /campaigns | Kampanya oluşturma | ADMIN |
| PATCH | /campaigns/:id | Kampanya güncelleme | ADMIN |
| DELETE | /campaigns/:id | Kampanya silme | ADMIN |

Gelecekte desteklenebilecek kampanyalar:

- yüzde indirim
- sabit tutar indirimi
- kategori bazlı indirim
- ürün bazlı indirim
- minimum sepet indirimi
- ilk sipariş indirimi
- sadakat puanı çarpanı

---

## 6.23 settings

Sistem genel ayarlarından sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /settings | Ayar listesi | ADMIN |
| PATCH | /settings/:key | Ayar güncelleme | ADMIN |

Örnek ayarlar:

- OTP aktif/pasif
- ödeme aktif/pasif
- teslimat aktif/pasif
- gel-al aktif/pasif
- sadakat aktif/pasif
- minimum sepet tutarı
- genel teslimat ücreti
- mağaza çalışma modu

---

## 6.24 reports

Raporlama ekranlarından sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /reports/sales/daily | Günlük satış | ADMIN |
| GET | /reports/sales/products | Ürün bazlı satış | ADMIN |
| GET | /reports/sales/categories | Kategori bazlı satış | ADMIN |
| GET | /reports/products/top-selling | En çok satan ürünler | ADMIN |
| GET | /reports/couriers/performance | Kurye performansı | ADMIN |
| GET | /reports/customers/stats | Müşteri istatistikleri | ADMIN |
| GET | /reports/loyalty/usage | Sadakat puanı kullanımı | ADMIN |

Tüm raporlar tarih aralığı desteklemelidir:

```text
?startDate=&endDate=
```

---

## 6.25 audit

Sistem değişiklik loglarından sorumludur.

Endpointler:

| Method | Path | Açıklama | Rol |
|---|---|---|---|
| GET | /audit | Log listesi | ADMIN |
| GET | /audit/:id | Log detayı | ADMIN |

Sorumluluklar:

- ürün değişiklikleri
- fiyat değişiklikleri
- stok değişiklikleri
- sipariş durum değişiklikleri
- kullanıcı yetki değişiklikleri
- eski/yeni değer JSON kaydı

---

# 9. Common Yapılar

## 9.1 Decorators

```text
common/decorators/
├── current-user.decorator.ts
├── roles.decorator.ts
├── permissions.decorator.ts
└── public.decorator.ts
```

---

## 9.2 Guards

```text
common/guards/
├── jwt-auth.guard.ts
├── roles.guard.ts
└── permissions.guard.ts
```

---

## 9.3 Filters

```text
common/filters/
└── http-exception.filter.ts
```

Standart hata formatı:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["phone must be a valid phone number"]
}
```

---

## 9.4 Interceptors

```text
common/interceptors/
├── response.interceptor.ts
├── audit.interceptor.ts
└── cache.interceptor.ts
```

Standart başarılı response formatı:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

## 9.5 Pipes

```text
common/pipes/
└── validation.pipe.ts
```

---

## 9.6 Utils

```text
common/utils/
├── slug.util.ts
├── pagination.util.ts
├── order-number.util.ts
├── hash.util.ts
├── money.util.ts
└── time-window.util.ts
```

---

# 10. Rate Limiting Kararı

ThrottlerModule kullanılacaktır.

Önerilen limitler:

| Alan | Limit |
|---|---|
| Global API | 100 istek / dakika / IP |
| Auth endpointleri | 10 istek / dakika / IP |
| OTP endpointleri | 5 istek / dakika / IP |
| Payment callback | özel imza doğrulama + düşük rate limit |

---

# 11. Modüller Arası İlişki Haritası

```text
auth ──────────────→ users
auth ──────────────→ otp
auth ──────────────→ refresh_tokens

users ─────────────→ addresses
users ─────────────→ roles

products ──────────→ categories
products ──────────→ allergens
products ──────────→ media
products ──────────→ stock

cart ──────────────→ products
cart ──────────────→ stock

orders ────────────→ cart
orders ────────────→ addresses
orders ────────────→ stores
orders ────────────→ stock
orders ────────────→ loyalty
orders ────────────→ notifications
orders ────────────→ audit

payments ──────────→ orders
payments ──────────→ stock
payments ──────────→ notifications

couriers ──────────→ users
couriers ──────────→ deliveries

deliveries ────────→ orders
deliveries ────────→ notifications

loyalty ───────────→ users
loyalty ───────────→ notifications

reviews ───────────→ orders
reviews ───────────→ products

campaigns ─────────→ products
campaigns ─────────→ categories

reports ───────────→ orders, products, couriers, loyalty

audit ─────────────← products, orders, stock, users, roles
```

---

# 12. Test Yapısı

Testler Jest ile yazılacaktır.

Önerilen yapı:

```text
test/
├── unit/
├── integration/
└── e2e/
```

Özellikle test edilmesi gereken kritik alanlar:

- auth login/register
- refresh token akışı
- stok düşme/rezervasyon
- sipariş oluşturma
- ödeme callback işleme
- sadakat puanı kullanımı
- yorum yetki kontrolü
- rol/yetki guard'ları

---

# 13. Nihai Özet

Güncel NestJS API yapısında toplam **25 ana modül** bulunacaktır.

Bu modüller:

- iş alanlarını net ayırır,
- bakım kolaylığı sağlar,
- vibe coding için güçlü context üretir,
- Prisma modeliyle uyumlu çalışır,
- web/admin/courier/mobile istemcilerine tek merkezden API sağlar.

Özellikle eklenen modüller:

```text
addresses
media
campaigns
settings
```

ve netleştirilen kararlar:

```text
bildirimlerde queue kullanımı
ödeme öncesi stok rezervasyonu
transaction güvenliği
MinIO medya yönetimi
```

projenin canlı ortama daha sağlam çıkmasını sağlayacaktır.

