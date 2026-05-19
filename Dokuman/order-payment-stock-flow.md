# Pastane & Fırın Platformu
# Sipariş, Ödeme ve Stok Akış Dokümanı

---

# 1. Temel Karar

Sipariş, ödeme ve stok akışı sistemin en kritik parçasıdır.

Bu projede temel karar şudur:

```text
Ödeme başarılı olmadan stok kesin olarak düşülmeyecek.
Ödeme başlatıldığında stok kısa süreli rezerve edilecek.
Ödeme başarılı olursa stok kesin düşülecek.
Ödeme başarısız olursa rezervasyon iptal edilecek.
```

---

# 2. Ana Akış

```text
Sepet
  ↓
Ödeme Başlat
  ↓
Stok Kontrolü
  ↓
Stok Rezervasyonu
  ↓
İyzico Ödeme
  ↓
Ödeme Sonucu
  ├── Başarılı → Sipariş Onaylandı + Stok Kesin Düşüldü
  └── Başarısız → Rezervasyon İptal + Sipariş İptal/Beklemede
```

---

# 3. Sipariş Durumları

| Durum | Açıklama |
|---|---|
| NEW | Sipariş yeni oluşturuldu |
| PAYMENT_PENDING | Ödeme bekleniyor |
| CONFIRMED | Ödeme başarılı, sipariş onaylandı |
| PREPARING | Sipariş hazırlanıyor |
| READY | Sipariş hazır |
| ASSIGNED_TO_COURIER | Kurye atandı |
| OUT_FOR_DELIVERY | Kurye yolda |
| DELIVERED | Teslim edildi |
| CANCELLED | İptal edildi |

Not:

Mevcut enumda `PAYMENT_PENDING` yoksa eklenmesi önerilir.

---

# 4. Ödeme Durumları

| Durum | Açıklama |
|---|---|
| PENDING | Ödeme süreci başladı |
| SUCCESS | Ödeme başarılı |
| FAILED | Ödeme başarısız |
| REFUNDED | Ödeme iade edildi |

---

# 5. Stok Rezervasyon Durumları

İleri seviye yapı için `stock_reservations` tablosu önerilir.

| Durum | Açıklama |
|---|---|
| ACTIVE | Rezervasyon aktif |
| CONFIRMED | Ödeme başarılı, stok kesin düşüldü |
| RELEASED | Rezervasyon serbest bırakıldı |
| EXPIRED | Süre dolduğu için iptal edildi |

---

# 6. Sipariş Oluşturma Akışı

## 6.1 Müşteri Sepeti Hazırlar

Müşteri:

- ürünleri sepete ekler
- ürün özelleştirmelerini seçer
- teslimat türünü seçer
- adres veya mağaza seçer
- sadakat puanı kullanacaksa belirtir

---

## 6.2 Sipariş Taslağı Oluşturulur

`POST /orders` çağrısı ile sipariş kaydı oluşturulur.

Bu aşamada:

- sepet snapshot alınır
- ürün adı kopyalanır
- fiyatlar kopyalanır
- adres snapshot alınır
- teslimat türü kaydedilir
- toplam tutar hesaplanır
- sipariş durumu `PAYMENT_PENDING` olur

---

## 6.3 Stok Kontrolü

Her sepet kalemi için:

- ürün aktif mi?
- ilgili saat penceresinde stok var mı?
- istenen adet stoktan fazla mı?
- ürün satışa açık mı?

kontrol edilir.

---

## 6.4 Stok Rezervasyonu

Stok uygunsa ürünler kısa süreli rezerve edilir.

Önerilen rezervasyon süresi:

```text
10 dakika
```

Rezervasyon süresi dolarsa stok serbest bırakılır.

---

# 7. Ödeme Başlatma Akışı

`POST /payments/initiate`

Bu endpoint:

- sipariş ödeme bekliyor mu kontrol eder
- ödeme tutarını sipariş tutarıyla karşılaştırır
- İyzico ödeme başlatır
- payment kaydı oluşturur
- ödeme sayfası veya 3D Secure yönlendirme bilgisi döner

---

# 8. İyzico Callback Akışı

`POST /payments/callback`

Callback geldiğinde:

## 8.1 Başarılı Ödeme

Transaction içinde:

1. payment.status = SUCCESS
2. order.status = CONFIRMED
3. stok rezervasyonu CONFIRMED yapılır
4. stok kesin düşülür
5. sadakat puanı kullanıldıysa kesin düşülür
6. online sipariş puanı kazanımı varsa işlenir
7. order status history kaydı yazılır
8. notification job queue’ya eklenir

---

## 8.2 Başarısız Ödeme

Transaction içinde:

1. payment.status = FAILED
2. stok rezervasyonu RELEASED yapılır
3. sadakat puanı rezervasyonu varsa iade edilir
4. order.status = CANCELLED veya PAYMENT_PENDING kalabilir
5. notification job queue’ya eklenir

Önerilen karar:

```text
Başarısız ödemede sipariş CANCELLED yapılır.
Müşteri tekrar sipariş oluşturabilir.
```

---

# 9. Ödeme Timeout Akışı

Eğer ödeme başlatıldıktan sonra 10 dakika içinde callback gelmezse:

1. ödeme timeout job çalışır
2. stok rezervasyonu EXPIRED yapılır
3. sipariş CANCELLED yapılır
4. payment FAILED/TIMEOUT olarak işaretlenir
5. müşteriye bildirim gönderilir

Not:

PaymentStatus enumuna `TIMEOUT` değeri eklenmesi düşünülebilir.

---

# 10. Kurye / Gel-Al Akışı

## 10.1 Adrese Teslim

```text
CONFIRMED
  ↓
PREPARING
  ↓
READY
  ↓
ASSIGNED_TO_COURIER
  ↓
OUT_FOR_DELIVERY
  ↓
DELIVERED
```

---

## 10.2 Mağazadan Teslim Al

```text
CONFIRMED
  ↓
PREPARING
  ↓
READY
  ↓
DELIVERED
```

Gel-al siparişlerde kurye ataması yapılmaz.

---

# 11. Durum Geçiş Kuralları

| Mevcut Durum | Geçebileceği Durumlar |
|---|---|
| PAYMENT_PENDING | CONFIRMED, CANCELLED |
| CONFIRMED | PREPARING, CANCELLED |
| PREPARING | READY |
| READY | ASSIGNED_TO_COURIER, DELIVERED |
| ASSIGNED_TO_COURIER | OUT_FOR_DELIVERY |
| OUT_FOR_DELIVERY | DELIVERED, CANCELLED |
| DELIVERED | - |
| CANCELLED | - |

---

# 12. İptal Kuralları

Müşteri yalnızca aşağıdaki durumlarda sipariş iptal edebilir:

```text
PAYMENT_PENDING
CONFIRMED
```

Operatör/Admin aşağıdaki durumlarda iptal edebilir:

```text
PAYMENT_PENDING
CONFIRMED
PREPARING
READY
```

Teslim edilen sipariş iptal edilemez.

---

# 13. Sadakat Puanı Akışı

## 13.1 Puan Kullanımı

Ödeme öncesinde müşteri puan kullanırsa:

- puan yeterli mi kontrol edilir
- indirime çevrilir
- siparişe snapshot olarak yazılır
- ödeme başarılı olana kadar kesin düşüm yapılmaz

Ödeme başarılıysa:

- puan düşülür
- loyalty movement oluşturulur

Ödeme başarısızsa:

- puan düşülmez
- rezervasyon varsa iptal edilir

---

## 13.2 Puan Kazanımı

Online siparişte puan kazanımı için önerilen karar:

```text
Puan sipariş DELIVERED olduktan sonra hesaba geçsin.
```

Sebep:

- iptal/iade riskini azaltır
- müşteriye gerçekten tamamlanmış alışverişten puan verilir

---

# 14. Kritik Transaction Noktaları

Aşağıdaki işlemler transaction içinde yapılmalıdır:

- sipariş oluşturma
- stok rezervasyonu
- ödeme callback işleme
- stok kesin düşme
- sadakat puanı düşme
- sipariş durum güncelleme
- kurye atama

---

# 15. Yarış Durumu Önlemleri

Aynı son stok ürününü iki müşteri almaya çalışabilir.

Bu nedenle stok düşme/rezervasyon işleminde:

- transaction
- row-level lock
- optimistic concurrency
- stok miktarı tekrar kontrolü

kullanılmalıdır.

---

# 16. Özet

Bu akış:

- stok çakışmasını azaltır,
- ödeme başarısızlığında stok kaybını engeller,
- sipariş durumlarını netleştirir,
- sadakat puanı hatalarını önler,
- kurye ve gel-al süreçlerini ayırır.
