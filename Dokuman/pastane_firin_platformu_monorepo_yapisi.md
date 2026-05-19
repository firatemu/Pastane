# Pastane & Fırın Platformu
# Monorepo Proje Yapısı

---

# 1. Genel Karar

Proje tek bir repository içerisinde monorepo yapısıyla geliştirilecektir.

Monorepo yönetimi için **Turborepo** kullanılacaktır.

Bu yapı özellikle:

- AI destekli geliştirme,
- vibe coding,
- ortak tip yönetimi,
- ortak veritabanı şeması,
- backend/frontend uyumu,
- merkezi konfigürasyon yönetimi

amaçları için tercih edilmiştir.

---

# 2. Monorepo Klasör Yapısı

```text
pastane-platform/
│
├── apps/
│   ├── api/                    # NestJS Backend API
│   ├── web/                    # Next.js Müşteri Web Sitesi
│   ├── admin/                  # Next.js Yönetim Paneli
│   ├── courier/                # Next.js Kurye Paneli
│   └── mobile/                 # React Native + Expo Android/iOS Uygulaması
│
├── packages/
│   ├── database/               # Prisma schema + migration dosyaları
│   ├── types/                  # Paylaşılan TypeScript tipleri
│   ├── ui/                     # Web/Admin/Courier için ortak UI bileşenleri
│   ├── config/                 # ESLint, TSConfig, Prettier ayarları
│   └── constants/              # Roller, sipariş durumları, ödeme durumları vb.
│
├── docker/
│   ├── docker-compose.dev.yml  # Geliştirme ortamı servisleri
│   ├── docker-compose.prod.yml # Production ortamı servisleri
│   └── nginx/                  # Reverse proxy ve SSL yapılandırmaları
│
├── docs/
│   ├── project-scope.md        # Proje kapsam dokümanı
│   ├── technology-stack.md     # Teknoloji altyapısı dokümanı
│   └── api-notes.md            # API notları ve entegrasyon açıklamaları
│
├── .env.example                # Örnek environment değişkenleri
├── turbo.json                  # Turborepo yapılandırması
└── package.json                # Root package yapılandırması
```

---

# 3. Apps Klasörü

`apps` klasörü çalıştırılabilir ana uygulamaları barındıracaktır.

---

## 3.1 apps/api

NestJS backend API uygulamasıdır.

Tüm iş mantığı burada yönetilecektir.

Ana modüller:

- auth
- users
- roles
- permissions
- products
- categories
- product-options
- allergens
- stock
- cart
- orders
- payments
- couriers
- loyalty
- reviews
- notifications
- reports
- audit-logs

Bu uygulama:

- web sitesine,
- admin paneline,
- kurye paneline,
- mobil uygulamaya

REST API sağlayacaktır.

---

## 3.2 apps/web

Next.js müşteri web sitesidir.

Odak noktası:

- yüksek kaliteli tasarım
- SEO uyumu
- hızlı ürün keşfi
- satış odaklı kullanıcı deneyimi
- mobil uyumlu arayüz
- ürün detay sayfaları
- sepet ve ödeme akışı
- sipariş takibi

Müşteriye görünen ana vitrin burasıdır.

Bu nedenle tasarım kalitesi bu uygulamada en kritik konudur.

---

## 3.3 apps/admin

Next.js yönetim panelidir.

Kullanım alanları:

- ürün yönetimi
- kategori yönetimi
- günlük/saatlik stok yönetimi
- sipariş yönetimi
- kurye atama
- kullanıcı ve yetki yönetimi
- sadakat puanı yönetimi
- yorum onaylama
- raporlama
- audit log görüntüleme

Admin panel müşteri sitesinden ayrı bir uygulama olarak geliştirilecektir.

Bunun sebebi:

- farklı tasarım ihtiyacı,
- farklı kullanıcı rolleri,
- farklı güvenlik kontrolleri,
- operasyon odaklı ekran yapısıdır.

---

## 3.4 apps/courier

Next.js kurye panelidir.

Kullanım alanları:

- atanmış siparişleri görüntüleme
- müşteri bilgilerini görme
- teslimat adresini görme
- sipariş içeriğini görüntüleme
- sipariş durumunu güncelleme
- teslim edildi / teslim edilemedi işaretleme

Kurye paneli sade, hızlı ve mobil uyumlu tasarlanacaktır.

---

## 3.5 apps/mobile

React Native + Expo Android/iOS mobil uygulamasıdır.

Kullanım alanları:

- müşteri üyeliği
- ürün listeleme
- kategori görüntüleme
- ürün detayları
- ürün özelleştirme
- sepet
- İyzico ödeme akışı
- sipariş takibi
- QR sadakat kodu
- puan görüntüleme
- yorum ve puan verme
- push notification

React Native + Expo uygulaması Node.js/Turborepo ekosistemine doğrudan bağlı olacaktır.

Ancak aynı repository içinde tutulması:

- proje bütünlüğü,
- AI context yönetimi,
- dokümantasyon birlikteliği,
- versiyon takibi

açısından faydalıdır.

---

# 4. Packages Klasörü

`packages` klasörü ortak kullanılan kodları ve yapılandırmaları barındıracaktır.

---

## 4.1 packages/database

Prisma veritabanı şeması ve migration dosyaları burada tutulacaktır.

İçerik:

- Prisma schema
- migration dosyaları
- seed dosyaları
- database client exportları

Bu paket özellikle kritik öneme sahiptir.

Çünkü veritabanı modeli tek merkezden yönetilecektir.

---

## 4.2 packages/types

Paylaşılan TypeScript tipleri burada tutulacaktır.

Kullanım alanları:

- API response tipleri
- DTO tipleri
- ortak model tipleri
- pagination tipleri
- auth response tipleri

Bu paket sayesinde:

- API,
- web,
- admin,
- courier

arasında tip uyumu sağlanacaktır.

---

## 4.3 packages/ui

Web tabanlı uygulamalar için ortak UI bileşenleri burada tutulacaktır.

Kullanacak uygulamalar:

- apps/web
- apps/admin
- apps/courier

Örnek bileşenler:

- Button
- Input
- Modal
- Card
- Table
- Badge
- StatusLabel
- ProductCard

Not:

React Native + Expo uygulaması web ui paketini kullanamaz.

React Native için ayrı widget yapısı `apps/mobile` içinde oluşturulacaktır.

---

## 4.4 packages/config

Ortak yapılandırma dosyaları burada tutulacaktır.

İçerik:

- ESLint config
- Prettier config
- TypeScript config
- shared build config

Amaç:

Tüm TypeScript projelerinde ortak kod standartları kullanmaktır.

---

## 4.5 packages/constants

Sistem genelinde kullanılan sabitler burada tutulacaktır.

Örnekler:

- kullanıcı rolleri
- sipariş durumları
- ödeme durumları
- teslimat türleri
- ürün durumları
- stok hareket tipleri
- yorum durumları

Örnek sabitler:

```text
ORDER_STATUS_NEW
ORDER_STATUS_PREPARING
ORDER_STATUS_READY
ORDER_STATUS_OUT_FOR_DELIVERY
ORDER_STATUS_DELIVERED
ORDER_STATUS_CANCELLED
```

Bu yapı sayesinde uygulamalar arasında sabit değer uyumsuzluğu engellenir.

---

# 5. Docker Klasörü

Docker ve deployment yapılandırmaları bu klasörde tutulacaktır.

---

## 5.1 docker-compose.dev.yml

Geliştirme ortamı için kullanılacaktır.

Çalışabilecek servisler:

- postgres
- redis
- minio
- api
- web
- admin
- courier

---

## 5.2 docker-compose.prod.yml

Production ortamı için kullanılacaktır.

Servisler production ayarlarıyla çalışacaktır.

---

## 5.3 docker/nginx

Nginx reverse proxy ve SSL yapılandırmaları burada tutulacaktır.

Kullanım amacı:

- domain yönlendirme
- SSL yönetimi
- API proxy
- statik dosya yönlendirme
- web/admin/courier route ayrımı

---

# 6. Docs Klasörü

Proje dokümantasyonları burada tutulacaktır.

Önerilen dosyalar:

```text
docs/project-scope.md
docs/technology-stack.md
docs/monorepo-structure.md
docs/api-notes.md
docs/deployment.md
docs/database-model.md
```

Bu klasör özellikle vibe coding sürecinde önemlidir.

AI araçlarına proje bağlamı vermek için dokümantasyonlar güncel tutulmalıdır.

---

# 7. Docker Compose Servisleri

Sistemde çalışacak temel servisler:

```text
postgres    # Ana veritabanı
redis       # Cache ve queue sistemi
minio       # Dosya depolama
api         # NestJS backend API
web         # Next.js müşteri web sitesi
admin       # Next.js yönetim paneli
courier     # Next.js kurye paneli
```

---

# 8. Monorepo Kullanım Avantajları

Bu yapı şu avantajları sağlar:

- tek repository yönetimi
- daha temiz AI context yapısı
- ortak tip kullanımı
- ortak veritabanı şeması
- merkezi konfigürasyon
- daha kolay refactor
- daha kontrollü deployment
- backend/frontend uyumunun kolay korunması
- tüm proje için tek versiyon takibi

---

# 9. Admin ve Kurye Panelinin Ayrı App Olma Kararı

Admin ve kurye paneli müşteri web sitesinden ayrı uygulamalar olarak geliştirilecektir.

Yapı:

```text
apps/web
apps/admin
apps/courier
```

Bu kararın sebepleri:

- müşteri sitesinin tasarım dili farklıdır
- admin panel operasyon odaklıdır
- kurye panel hızlı ve sade olmalıdır
- güvenlik ve routing daha temiz yönetilir
- build/deploy süreçleri ayrılabilir

---

# 10. React Native + Expo Uygulamasının Monorepo İçindeki Yeri

React Native + Expo uygulaması `apps/mobile` altında tutulacaktır.

React Native + Expo, TypeScript kullandığı için ortak paketleri kullanabilecektir.

Ancak aynı repository içinde olması şu avantajları sağlar:

- tüm proje tek yerde tutulur
- mobil ekip aynı dokümantasyona erişir
- API değişiklikleri daha kolay takip edilir
- AI araçları tüm proje bağlamını görebilir
- versiyonlama daha düzenli olur

---

# 11. Nihai Karar

Proje için önerilen yapı:

```text
Turborepo Monorepo
│
├── NestJS API
├── Next.js Web
├── Next.js Admin
├── Next.js Courier
├── React Native + Expo Mobile
├── Prisma Database Package
├── Shared Types
├── Shared UI
├── Shared Constants
└── Docker Deployment
```

Bu yapı proje için:

- modern,
- düzenli,
- AI destekli geliştirmeye uygun,
- ölçeklenebilir,
- bakımı kolay,
- profesyonel

bir temel oluşturacaktır.

