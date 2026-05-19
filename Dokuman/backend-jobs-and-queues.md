# Pastane & Fırın Platformu
# Backend Background Jobs ve Queue Planı

---

# 1. Amaç

Bazı işlemler API request sürecinde doğrudan çalıştırılmamalıdır.

Bunun yerine Redis + BullMQ gibi queue altyapısıyla arka planda işlenmelidir.

Bu yaklaşım:

- API yanıt süresini kısaltır,
- hata durumunda tekrar deneme sağlar,
- SMS/e-posta/push gibi dış servis hatalarını izole eder,
- ödeme ve stok timeout işlemlerini güvenli hale getirir.

---

# 2. Kullanılacak Teknoloji

```text
Redis + BullMQ
```

NestJS tarafında queue yönetimi için BullMQ entegrasyonu kullanılabilir.

---

# 3. Queue Listesi

| Queue | Amaç |
|---|---|
| notifications | Push, SMS, e-posta bildirimleri |
| payments | Ödeme timeout ve ödeme sonrası işlemler |
| stock | Stok rezervasyon timeout işlemleri |
| loyalty | Puan kazanım/kullanım işlemleri |
| reports | Ağır rapor üretimleri |
| media | Görsel optimize/WebP işlemleri |

---

# 4. Notification Jobs

## 4.1 send-push-notification

Kullanım alanları:

- sipariş alındı
- sipariş hazırlanıyor
- kurye yolda
- teslim edildi
- kampanya bildirimi

Payload:

```json
{
  "userId": "uuid",
  "title": "Siparişiniz hazırlanıyor",
  "body": "Siparişiniz mutfakta hazırlanmaya başladı.",
  "metadata": {
    "orderId": "uuid"
  }
}
```

---

## 4.2 send-sms

Kullanım alanları:

- OTP
- kritik sipariş bildirimi
- şifre sıfırlama

Payload:

```json
{
  "phone": "905551112233",
  "message": "Doğrulama kodunuz: 123456"
}
```

---

## 4.3 send-email

Kullanım alanları:

- sipariş özeti
- ödeme sonucu
- şifre sıfırlama
- fatura bilgilendirmesi

Payload:

```json
{
  "to": "user@example.com",
  "subject": "Sipariş Özeti",
  "template": "order-summary",
  "data": {
    "orderNumber": "2026-00001"
  }
}
```

---

# 5. Payment Jobs

## 5.1 payment-timeout

Ödeme başlatıldıktan sonra belirli süre içinde callback gelmezse çalışır.

Önerilen süre:

```text
10 dakika
```

İşlem:

1. ödeme hala PENDING mi kontrol et
2. siparişi CANCELLED yap
3. stok rezervasyonunu serbest bırak
4. müşteriye bildirim gönder

---

## 5.2 payment-success-finalize

Ödeme başarılı olduktan sonra:

1. payment SUCCESS yapılır
2. order CONFIRMED yapılır
3. stok kesin düşülür
4. sadakat puanı işlenir
5. bildirim gönderilir

Bu işlem mümkün olduğunca transaction içinde yapılmalıdır.

---

# 6. Stock Jobs

## 6.1 stock-reservation-timeout

Stok rezervasyonu süresi dolduğunda çalışır.

İşlem:

1. aktif rezervasyonu bul
2. süre dolmuş mu kontrol et
3. rezervasyonu EXPIRED yap
4. stoğu serbest bırak
5. ilgili ödeme/sipariş hâlâ bekliyorsa iptal et

---

# 7. Loyalty Jobs

## 7.1 earn-points-after-delivery

Sipariş DELIVERED olduktan sonra müşteriye puan kazandırır.

Karar:

```text
Puan sipariş teslim edildikten sonra hesaba geçer.
```

Payload:

```json
{
  "orderId": "uuid",
  "userId": "uuid",
  "amount": 250.00
}
```

---

# 8. Media Jobs

## 8.1 optimize-product-image

Ürün görseli yüklendikten sonra:

- resize yapılır,
- WebP dönüşümü yapılır,
- thumbnail oluşturulur,
- metadata güncellenir.

---

# 9. Report Jobs

## 9.1 generate-daily-sales-report

Günlük satış raporu arka planda üretilebilir.

Özellikle veri arttığında raporları request sırasında hesaplamak yerine cache veya background job ile hazırlamak daha sağlıklıdır.

---

# 10. Retry Politikası

Önerilen retry ayarları:

| Job Türü | Deneme | Backoff |
|---|---:|---|
| Push notification | 3 | exponential |
| SMS | 3 | exponential |
| Email | 3 | exponential |
| Payment finalize | 5 | fixed/exponential |
| Stock timeout | 3 | fixed |
| Media optimize | 2 | fixed |

---

# 11. Dead Letter Mantığı

Belirli sayıda denemeden sonra başarısız olan işler:

- failed jobs olarak saklanmalı,
- admin tarafından incelenebilmeli,
- gerekirse tekrar çalıştırılabilmelidir.

---

# 12. Monitoring

Queue için izlenmesi gereken metrikler:

- bekleyen job sayısı
- başarısız job sayısı
- ortalama işlenme süresi
- notification başarısızlık oranı
- payment timeout sayısı

---

# 13. Özet

Backend tarafında queue kullanılması özellikle şu modüller için kritiktir:

- notifications
- payments
- stock reservations
- loyalty
- media

Bu yapı canlı ortamda API’nin daha stabil ve hızlı çalışmasını sağlar.
