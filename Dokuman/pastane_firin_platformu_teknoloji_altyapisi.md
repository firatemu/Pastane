# Pastane & Fırın Platformu
# Teknoloji Altyapısı ve Yazılım Mimarisi

---

# 1. Genel Teknoloji Kararı

Proje;

- web sitesi
- yönetim paneli
- kurye paneli
- Android uygulama
- iOS uygulama

olarak geliştirileceği için modern, ölçeklenebilir ve AI destekli geliştirmeye uygun bir teknoloji altyapısı tercih edilmiştir.

Sistem SaaS olmayacaktır.

Tek işletme (single tenant) mantığında çalışacaktır.

Ancak gelecekte büyümeye uygun modüler mimari kullanılacaktır.

---

# 2. Backend Teknolojisi

## NestJS + TypeScript

Backend tarafında:

- NestJS
- TypeScript

kullanılacaktır.

## Tercih Sebepleri

- Modüler mimari desteği
- Role-based sistemler için uygun yapı
- Güçlü TypeScript desteği
- AI destekli geliştirmeye uygunluk
- REST API ve WebSocket desteği
- Frontend ile aynı dil ekosistemi
- Büyük ölçekli projelere uygun yapı

---

# 3. ORM ve Veritabanı

## PostgreSQL

Ana veritabanı olarak PostgreSQL kullanılacaktır.

## Prisma ORM

ORM katmanında Prisma kullanılacaktır.

## Tercih Sebepleri

- Güçlü ilişkisel veri modeli
- Type-safe query yapısı
- AI araçlarıyla yüksek uyumluluk
- Migration yönetimi
- Hızlı geliştirme süreci

---

# 4. Cache ve Queue Sistemi

## Redis

Redis kullanılacaktır.

## Kullanım Alanları

- cache işlemleri
- queue sistemi
- OTP işlemleri
- notification queue
- performans optimizasyonları

---

# 5. Web Frontend Teknolojisi

## Next.js

Müşteri web sitesi Next.js ile geliştirilecektir.

## Özellikler

- SEO uyumlu yapı
- SSR / SSG desteği
- yüksek performans
- mobil uyumlu yapı
- hızlı sayfa geçişleri

---

## Tailwind CSS

UI geliştirmelerinde Tailwind CSS kullanılacaktır.

---

## Shadcn/UI

Modern component yapısı için kullanılacaktır.

---

# 6. Admin ve Kurye Paneli

Admin ve kurye panelleri Next.js içerisinde geliştirilecektir.

## Route Yapısı

```text
/
  müşteri web sitesi

/admin
  yönetim paneli

/courier
  kurye paneli
```

## Avantajları

- tek frontend codebase
- ortak component kullanımı
- hızlı geliştirme
- merkezi authentication yönetimi

---

# 7. Mobil Uygulama Teknolojisi

## React Native + Expo

Android ve iOS uygulamaları React Native + Expo ile geliştirilecektir.

## Tercih Sebepleri

- Tek kod tabanı
- Native performansa yakın yapı
- Android ve iOS desteği
- QR kod desteği
- Push notification desteği
- Güçlü UI sistemi
- Modern mobil deneyim

---

# 8. Dosya Depolama Sistemi

## MinIO

Ürün görselleri ve medya dosyaları için MinIO kullanılacaktır.

## Özellikler

- self-hosted yapı
- S3 uyumlu API
- Docker desteği
- gelecekte AWS S3 geçişine uygunluk

---

# 9. Ödeme Sistemi

## İyzico

Online ödeme altyapısı olarak İyzico kullanılacaktır.

## Desteklenecek Ödeme Türleri

- kredi kartı
- banka kartı

---

# 10. Push Notification Sistemi

## Firebase Cloud Messaging (FCM)

Mobil bildirimler için kullanılacaktır.

## Kullanım Alanları

- sipariş durumu
- kampanyalar
- teslimat bildirimleri
- özel teklifler

---

# 11. SMS Sistemi

## Netgsm / İleti Merkezi

OTP ve SMS bildirimleri için kullanılacaktır.

İlk geliştirme aşamasında pasif olacaktır.

Prod ortamında aktif edilecektir.

---

# 12. Sunucu ve Deployment Yapısı

## Ubuntu VPS

Sunucu işletim sistemi olarak Ubuntu kullanılacaktır.

---

## Docker

Tüm servisler Docker container yapısında çalışacaktır.

---

## Docker Compose

Sistem servisleri Docker Compose ile yönetilecektir.

## Çalışacak Servisler

```text
api
postgres
redis
minio
nextjs
```

## Avantajları

- tek komutla sistem kurulumu
- taşınabilir altyapı
- kolay deployment
- kolay yedekleme
- dev/prod ortam ayrımı

---

# 13. Genel Mimari Yapı

```text
React Native Mobile Apps
        │
        ▼
   Next.js Frontend
        │
        ▼
 NestJS Backend API
        │
 ┌──────┼──────┐
 ▼      ▼      ▼
Postgres Redis MinIO
```

---

# 14. Nihai Teknoloji Stack Özeti

| Katman | Teknoloji |
|---|---|
| Backend API | NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache/Queue | Redis |
| Web Frontend | Next.js |
| UI | Tailwind CSS + Shadcn/UI |
| Admin Panel | Next.js |
| Kurye Paneli | Next.js |
| Mobil Uygulama | React Native + Expo |
| Storage | MinIO |
| Payment | İyzico |
| Push Notification | Firebase Cloud Messaging |
| SMS | Netgsm / İleti Merkezi |
| Deployment | Docker + Docker Compose |
| Server | Ubuntu VPS |

---

# 15. Teknoloji Seçim Kararının Özeti

Bu teknoloji altyapısı;

- modern
- ölçeklenebilir
- AI destekli geliştirmeye uygun
- tip güvenli
- mobil uyumlu
- performanslı
- uzun vadeli bakım yapılabilir

bir yapı sunacaktır.

Özellikle vibe coding / AI destekli geliştirme yaklaşımında:

- NestJS
- Prisma
- Next.js
- TypeScript

kombinasyonu yüksek verim sağlayacaktır.

