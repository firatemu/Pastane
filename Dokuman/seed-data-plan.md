# Pastane & Fırın Platformu
# Seed Data Planı

---

# 1. Amaç

Seed data, geliştirme ve test sürecini hızlandırmak için kullanılacaktır.

İlk kurulumda sistemin çalışır hale gelmesi için gerekli temel veriler otomatik oluşturulacaktır.

---

# 2. Seed Çalıştırma

Önerilen komut:

```bash
npx prisma db seed --schema=packages/database/schema.prisma
```

Docker içinde:

```bash
docker compose -f docker-compose.dev.yml exec api \
  npx prisma db seed --schema=packages/database/schema.prisma
```

---

# 3. Seed Sırası

Seed işlemleri aşağıdaki sırayla yapılmalıdır:

```text
1. Roles
2. Permissions
3. RolePermissions
4. Admin User
5. Demo Users
6. Couriers
7. Stores
8. Allergens
9. Categories
10. Products
11. Product Images
12. Product Options
13. Stock Entries
14. Loyalty Settings
15. Delivery Zones
16. Demo Orders
17. Demo Reviews
```

---

# 4. Roller

Oluşturulacak roller:

| Rol | Açıklama |
|---|---|
| ADMIN | Sistem yöneticisi |
| ORDER_OPERATOR | Sipariş operasyon kullanıcısı |
| PRODUCT_MANAGER | Ürün ve stok yöneticisi |
| COURIER | Kurye |
| CUSTOMER | Müşteri |

---

# 5. İzinler

Temel izinler:

```text
users.view
users.update
users.changeStatus

roles.view
roles.create
roles.update
roles.delete

permissions.view
permissions.manage

products.view
products.create
products.update
products.delete
products.manageImages
products.manageOptions
products.manageAllergens

categories.view
categories.create
categories.update
categories.delete

stock.view
stock.create
stock.update
stock.adjust
stock.viewMovements

orders.view
orders.viewOwn
orders.viewAll
orders.create
orders.updateStatus
orders.cancel
orders.assignCourier

payments.view
payments.initiate
payments.refund

couriers.view
couriers.create
couriers.update
couriers.performance

deliveries.viewOwn
deliveries.updateOwn
deliveries.viewAll

loyalty.viewOwn
loyalty.scan
loyalty.redeem
loyalty.manageSettings
loyalty.viewReports

reviews.create
reviews.view
reviews.moderate
reviews.delete

notifications.viewOwn
notifications.send
notifications.manage

campaigns.view
campaigns.create
campaigns.update
campaigns.delete

settings.view
settings.update

reports.sales
reports.products
reports.couriers
reports.customers
reports.loyalty

audit.view
```

---

# 6. Varsayılan Kullanıcılar

## 6.1 Admin

```text
Ad: Sistem
Soyad: Admin
Telefon: 905550000001
E-posta: admin@pastane.com
Şifre: Admin123!
Rol: ADMIN
Telefon doğrulandı: true
```

---

## 6.2 Sipariş Operatörü

```text
Ad: Sipariş
Soyad: Operatörü
Telefon: 905550000002
E-posta: operator@pastane.com
Şifre: Operator123!
Rol: ORDER_OPERATOR
```

---

## 6.3 Ürün Yöneticisi

```text
Ad: Ürün
Soyad: Yöneticisi
Telefon: 905550000003
E-posta: product@pastane.com
Şifre: Product123!
Rol: PRODUCT_MANAGER
```

---

## 6.4 Kurye Kullanıcıları

```text
Kurye 1:
Telefon: 905550000004
E-posta: kurye1@pastane.com
Şifre: Courier123!

Kurye 2:
Telefon: 905550000005
E-posta: kurye2@pastane.com
Şifre: Courier123!
```

---

## 6.5 Demo Müşteri

```text
Ad: Demo
Soyad: Müşteri
Telefon: 905550000010
E-posta: musteri@pastane.com
Şifre: Customer123!
Rol: CUSTOMER
```

---

# 7. Mağaza

Varsayılan mağaza:

```text
Ad: Merkez Pastane
Telefon: 0324 000 00 00
İl: Mersin
İlçe: Yenişehir
Adres: Demo Mahallesi, Demo Caddesi No:1
Çalışma Saatleri:
Pazartesi-Pazar 08:00-22:00
Aktif: true
```

---

# 8. Alerjenler

Oluşturulacak alerjenler:

```text
Gluten
Süt
Yumurta
Fındık
Fıstık
Ceviz
Susam
```

---

# 9. Kategoriler

Ana kategoriler:

```text
Pastalar
Yaş Pastalar
Kuru Pastalar
Ekmekler
Simit & Poğaça
Tatlılar
İçecekler
```

Alt kategoriler:

```text
Pastalar > Doğum Günü Pastaları
Pastalar > Özel Tasarım Pastalar
Tatlılar > Sütlü Tatlılar
Tatlılar > Şerbetli Tatlılar
Ekmekler > Beyaz Ekmek
Ekmekler > Tam Buğday
```

---

# 10. Demo Ürünler

## 10.1 Yaş Pasta

```text
Ad: Çikolatalı Yaş Pasta
Kategori: Yaş Pastalar
Fiyat: 650.00
Hazırlanma Süresi: 60 dakika
Alerjenler: Gluten, Süt, Yumurta, Fındık
Durum: ACTIVE
```

Özelleştirme grupları:

```text
Kişi Sayısı:
- 4-6 kişilik
- 8-10 kişilik
- 12-15 kişilik

Aroma:
- Çikolatalı
- Çilekli
- Muzlu

Ekstra:
- Mum
- Yazı
```

---

## 10.2 Simit

```text
Ad: Susamlı Simit
Kategori: Simit & Poğaça
Fiyat: 15.00
Hazırlanma Süresi: 5 dakika
Alerjenler: Gluten, Susam
Durum: ACTIVE
```

---

## 10.3 Poğaça

```text
Ad: Peynirli Poğaça
Kategori: Simit & Poğaça
Fiyat: 25.00
Hazırlanma Süresi: 5 dakika
Alerjenler: Gluten, Süt, Yumurta
Durum: ACTIVE
```

---

## 10.4 Ekmek

```text
Ad: Beyaz Ekmek
Kategori: Ekmekler
Fiyat: 12.50
Hazırlanma Süresi: 5 dakika
Alerjenler: Gluten
Durum: ACTIVE
```

---

## 10.5 Tatlı

```text
Ad: Sütlaç
Kategori: Sütlü Tatlılar
Fiyat: 80.00
Hazırlanma Süresi: 10 dakika
Alerjenler: Süt
Durum: ACTIVE
```

---

# 11. Stok Kayıtları

Bugünün tarihi için örnek stoklar:

```text
Simit:
08:00-12:00 → 100 adet
12:00-16:00 → 80 adet

Poğaça:
08:00-12:00 → 60 adet
12:00-16:00 → 40 adet

Ekmek:
08:00-12:00 → 120 adet
12:00-18:00 → 150 adet

Yaş Pasta:
Tüm gün → 10 adet

Sütlaç:
Tüm gün → 30 adet
```

---

# 12. Sadakat Ayarları

Varsayılan ayarlar:

```text
earnRate: 10.00
pointValue: 0.10
minimumRedeem: 50
isActive: true
```

Yorum:

```text
100 TL alışverişte 10 puan kazanılır.
1 puan = 0.10 TL değerindedir.
En az 50 puan kullanılabilir.
```

---

# 13. Teslimat Bölgeleri

Örnek bölgeler:

```text
Yenişehir:
Minimum Sipariş: 150 TL
Teslimat Ücreti: 30 TL
Tahmini Süre: 30 dakika

Mezitli:
Minimum Sipariş: 200 TL
Teslimat Ücreti: 40 TL
Tahmini Süre: 40 dakika

Akdeniz:
Minimum Sipariş: 200 TL
Teslimat Ücreti: 45 TL
Tahmini Süre: 45 dakika
```

---

# 14. Demo Siparişler

Demo müşteri için örnek siparişler oluşturulabilir:

```text
Sipariş 1:
Durum: DELIVERED
Ürünler: Simit x2, Poğaça x2
Teslimat Türü: PICKUP

Sipariş 2:
Durum: PREPARING
Ürünler: Çikolatalı Yaş Pasta x1
Teslimat Türü: HOME_DELIVERY

Sipariş 3:
Durum: OUT_FOR_DELIVERY
Ürünler: Sütlaç x3
Teslimat Türü: HOME_DELIVERY
Kurye: Kurye 1
```

---

# 15. Demo Yorumlar

Teslim edilmiş sipariş ürünü için yorum:

```text
Ürün: Simit
Puan: 5
Yorum: Çok taze ve lezzetliydi.
Durum: APPROVED
```

---

# 16. Seed Güvenlik Notu

Production ortamında seed dikkatli kullanılmalıdır.

Production’da sadece şu veriler seed edilebilir:

- roller
- izinler
- admin kullanıcı
- alerjen master listesi
- temel sistem ayarları

Demo müşteri, demo sipariş ve demo ürünler production’da çalıştırılmamalıdır.

---

# 17. Özet

Bu seed planı sayesinde:

- sistem ilk kurulumda çalışır hale gelir,
- admin panel test edilebilir,
- ürün listeleme denenebilir,
- sipariş akışı simüle edilebilir,
- kurye paneli test edilebilir,
- yorum ve sadakat sistemi kontrol edilebilir.
