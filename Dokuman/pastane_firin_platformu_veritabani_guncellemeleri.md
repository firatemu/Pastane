# Pastane & Fırın Platformu
# Veritabanı Şeması Güncellemeleri

Bu doküman mevcut Prisma veritabanı şemasına eklenmesi ve güncellenmesi önerilen yapıları içermektedir.

Amaç:

- canlı ortam ihtiyaçlarını karşılamak,
- mobil/web/admin oturum yönetimini güçlendirmek,
- saatlik stok yapısını doğru modellemek,
- mağazadan teslim alma süreçlerini desteklemek,
- güvenlik ve ölçeklenebilirliği artırmaktır.

---

# 1. Saatlik Stok Yapısı Güncellemesi

## Problem

Mevcut yapı:

```prisma
@@unique([productId, date])
```

Bu yapı aynı ürün için aynı gün içinde yalnızca tek stok kaydı açılmasına izin verir.

Ancak pastane/fırın operasyonunda:

- sabah simit üretimi,
- öğle ekmek üretimi,
- akşam tatlı üretimi

aynı gün içerisinde farklı stok pencereleri oluşturabilir.

---

## Güncel Yapı

```prisma
model StockEntry {
  id            String          @id @default(uuid())
  productId     String
  product       Product         @relation(fields: [productId], references: [id])

  date          DateTime

  quantity      Int

  availableFrom String?
  availableTo   String?

  movements     StockMovement[]

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([productId, date, availableFrom, availableTo])
  @@map("stock_entries")
}
```

---

# 2. Courier ↔ User Relation Güncellemesi

## Problem

Courier tablosunda `userId` alanı mevcut ancak Prisma relation eksik.

---

## Güncel Yapı

### User

```prisma
model User {
  id               String         @id @default(uuid())

  courier          Courier?
}
```

---

### Courier

```prisma
model Courier {
  id         String         @id @default(uuid())

  userId     String         @unique

  user       User           @relation(fields: [userId], references: [id])

  vehicle    String?

  status     CourierStatus  @default(ACTIVE)

  deliveries Delivery[]

  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@map("couriers")
}
```

---

# 3. OTP SMS Sistemi

Mobil ve web üyelik süreçleri için OTP doğrulama altyapısı eklenmelidir.

---

## Yeni Tablo: otp_codes

```prisma
model OtpCode {
  id           String   @id @default(uuid())

  phone        String

  code         String

  purpose      String

  attemptCount Int      @default(0)

  expiresAt    DateTime

  usedAt       DateTime?

  createdAt    DateTime @default(now())

  @@map("otp_codes")
}
```

---

## Kullanım Alanları

- kayıt doğrulama
- şifre sıfırlama
- telefon doğrulama
- kritik işlem doğrulaması

---

# 4. Refresh Token / Session Yönetimi

Web, mobil, admin ve kurye paneli için güvenli oturum yönetimi gereklidir.

---

## Yeni Tablo: refresh_tokens

```prisma
model RefreshToken {
  id           String   @id @default(uuid())

  userId       String

  user         User     @relation(fields: [userId], references: [id])

  tokenHash    String

  deviceInfo   String?

  ipAddress    String?

  expiresAt    DateTime

  revokedAt    DateTime?

  createdAt    DateTime @default(now())

  @@map("refresh_tokens")
}
```

---

## Avantajları

- çoklu cihaz desteği
- güvenli logout işlemleri
- token iptal yönetimi
- cihaz bazlı oturum takibi

---

# 5. Mağaza / Şube Sistemi

Gel-al siparişleri için mağaza bilgileri tutulmalıdır.

---

## Yeni Tablo: stores

```prisma
model Store {
  id            String    @id @default(uuid())

  name          String

  phone         String?

  city          String

  district      String

  address       String

  latitude      Decimal?  @db.Decimal(10, 7)

  longitude     Decimal?  @db.Decimal(10, 7)

  workingHours  Json?

  isActive      Boolean   @default(true)

  orders        Order[]

  createdAt     DateTime  @default(now())

  updatedAt     DateTime  @updatedAt

  @@map("stores")
}
```

---

# 6. Order Tablosu Güncellemesi

## Yeni Alanlar

```prisma
pickupStoreId String?
pickupStore   Store?    @relation(fields: [pickupStoreId], references: [id])

scheduledAt   DateTime?

deliveryFee   Decimal   @default(0) @db.Decimal(10, 2)

serviceFee    Decimal   @default(0) @db.Decimal(10, 2)

grandTotal    Decimal   @db.Decimal(10, 2)
```

---

## Açıklamalar

### scheduledAt

Müşteri:

- belirli saatte teslimat
- belirli saatte mağazadan teslim alma

seçebilecektir.

---

### deliveryFee

Kurye teslimat ücretidir.

---

### serviceFee

İleride platform servis ücreti gibi ek maliyetler için kullanılabilir.

---

### grandTotal

Nihai tahsil edilen toplam tutardır.

---

# 7. Loyalty Settings Sistemi

Sadakat sistemi ayarları merkezi yönetilmelidir.

---

## Yeni Tablo: loyalty_settings

```prisma
model LoyaltySetting {
  id                String   @id @default(uuid())

  earnRate          Decimal  @db.Decimal(5, 2)

  pointValue        Decimal  @db.Decimal(10, 2)

  minimumRedeem     Int

  isActive          Boolean  @default(true)

  createdAt         DateTime @default(now())

  updatedAt         DateTime @updatedAt

  @@map("loyalty_settings")
}
```

---

## Kullanım Amaçları

- 100 TL alışveriş = kaç puan?
- 1 puan kaç TL eder?
- minimum puan kullanımı
- kampanya dönemleri

---

# 8. Review Rating Kontrolü

## Problem

`rating Int` alanı veritabanında sınırlandırılmamış.

---

## Öneri

Uygulama katmanında:

```text
1 <= rating <= 5
```

kontrolü zorunlu yapılmalıdır.

Ek olarak PostgreSQL CHECK constraint düşünülebilir.

---

# 9. Dosya Yönetimi Güncellemesi

## Problem

Sadece `url` tutulması ileride dosya yönetimini zorlaştırabilir.

---

## Güncel ProductImage Yapısı

```prisma
model ProductImage {
  id         String   @id @default(uuid())

  productId  String

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  bucket     String?

  objectKey  String?

  url        String

  mimeType   String?

  size       Int?

  altText    String?

  sortOrder  Int      @default(0)

  isPrimary  Boolean  @default(false)

  createdAt  DateTime @default(now())

  @@map("product_images")
}
```

---

# 10. Delivery Zones Sistemi (Önerilen)

Teslimat bölgeleri ileride önemli hale gelebilir.

---

## Yeni Tablo: delivery_zones

```prisma
model DeliveryZone {
  id                String   @id @default(uuid())

  name              String

  minimumOrderPrice Decimal? @db.Decimal(10, 2)

  deliveryFee       Decimal  @db.Decimal(10, 2)

  estimatedMinutes  Int?

  isActive          Boolean  @default(true)

  createdAt         DateTime @default(now())

  updatedAt         DateTime @updatedAt

  @@map("delivery_zones")
}
```

---

## Kullanım Alanları

- bölge bazlı teslimat ücreti
- minimum sipariş tutarı
- teslimat süresi tahmini
- servis verilmeyen bölgeler

---

# 11. Nihai Güncelleme Özeti

Sisteme eklenmesi önerilen yeni tablolar:

| Tablo | Amaç |
|---|---|
| otp_codes | OTP doğrulama sistemi |
| refresh_tokens | Güvenli oturum yönetimi |
| stores | Gel-al mağaza sistemi |
| loyalty_settings | Sadakat sistemi ayarları |
| delivery_zones | Teslimat bölgesi yönetimi |

---

Güncellenmesi önerilen tablolar:

| Tablo | Güncelleme |
|---|---|
| stock_entries | Saatlik stok desteği |
| couriers | User relation düzeltmesi |
| orders | mağaza teslimi + teslimat ücreti + planlı teslimat |
| product_images | gelişmiş dosya yönetimi |
| reviews | rating validasyonu |

---

# 12. Genel Sonuç

Mevcut veritabanı şeması güçlü bir temel oluşturmaktadır.

Yapılan bu güncellemelerle birlikte sistem:

- canlı operasyonlara daha uygun,
- güvenlik açısından daha güçlü,
- mobil/web uyumlu,
- ölçeklenebilir,
- kurye operasyonlarına hazır,
- sadakat sistemi açısından esnek,
- AI destekli geliştirmeye uygun

bir yapıya ulaşacaktır.

