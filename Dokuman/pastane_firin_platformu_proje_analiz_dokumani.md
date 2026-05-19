# Pastane & Fırın E-Ticaret, Operasyon ve Sadakat Platformu
## Proje Analiz ve Kapsam Dokümanı (Final Taslak)

---

# 1. Proje Tanımı

Bu proje;

- web sitesi,
- Android mobil uygulama,
- iOS mobil uygulama,
- yönetim paneli,
- kurye paneli

olan kapsamlı bir **pastane & fırın sipariş ve operasyon yönetim sistemi** olacaktır.

Sistem;

- online sipariş,
- mağazadan teslim alma,
- kurye yönetimi,
- sipariş operasyonu,
- sadakat puanı,
- QR müşteri sistemi,
- ürün/stok yönetimi,
- rol bazlı yetkilendirme

özelliklerini merkezi bir altyapı üzerinden yönetecektir.

Tüm platformlar aynı backend/API altyapısını kullanacaktır.

---

# 2. Platformlar

## 2.1 Web Sitesi

Müşteri tarafı web uygulaması:

- ürün listeleme
- kategori görüntüleme
- kampanyalar
- sepete ekleme
- ödeme
- sipariş takibi
- üyelik işlemleri
- QR sadakat ekranı
- profil yönetimi

---

## 2.2 Android Uygulaması

Mobil müşteri uygulaması:

- tüm sipariş işlemleri
- push notification
- QR kod gösterimi
- sadakat puanı
- aktif sipariş takibi
- favoriler
- hızlı sipariş

---

## 2.3 iOS Uygulaması

Android ile aynı özelliklere sahip olacaktır.

---

## 2.4 Yönetim Paneli

Şirket çalışanlarının kullanacağı yönetim ekranı:

- ürün yönetimi
- kategori yönetimi
- sipariş yönetimi
- kurye yönetimi
- müşteri yönetimi
- rol/yetki yönetimi
- stok yönetimi
- kampanya yönetimi
- sadakat puanı yönetimi
- raporlama

---

## 2.5 Kurye Paneli

Kurye kullanıcıları için özel panel:

- atanmış siparişler
- teslimat bilgileri
- müşteri iletişim bilgileri
- sipariş durumu güncelleme
- teslim edildi işlemi

---

# 3. Kullanıcı Rolleri

## 3.1 Müşteri

Yetkiler:

- sipariş oluşturma
- ödeme yapma
- sipariş geçmişi görüntüleme
- QR kod görüntüleme
- puan kullanma
- adres yönetimi

---

## 3.2 Sipariş Operatörü

Yetkiler:

- gelen siparişleri görüntüleme
- sipariş onaylama
- sipariş durum değiştirme
- kurye atama

---

## 3.3 Ürün Yöneticisi

Yetkiler:

- ürün ekleme
- ürün düzenleme
- kategori yönetimi
- stok yönetimi

---

## 3.4 Kurye

Yetkiler:

- kendi siparişlerini görüntüleme
- teslim durumunu güncelleme

---

## 3.5 Admin

Tüm sistem yetkileri.

---

# 4. Üyelik ve Kimlik Doğrulama

## 4.1 Üyelik

Kullanıcı:

- ad soyad
- telefon
- e-posta
- şifre

ile kayıt olabilir.

---

## 4.2 OTP SMS Sistemi

Kullanıcı kayıt olurken:

- telefon numarasına OTP SMS gönderilecek
- doğrulama kodu girilecek

NOT:
İlk geliştirme aşamasında pasif olacaktır.
Prod ortamında aktif edilecektir.

---

## 4.3 Giriş Sistemi

- telefon + şifre
veya
- e-posta + şifre

ile giriş yapılabilecek.

---

# 5. Ürün Sistemi

## 5.1 Ürün Bilgileri

Her ürün için:

- ürün adı
- açıklama
- kısa açıklama
- ürün görselleri
- fiyat
- indirimli fiyat
- kategori
- stok durumu
- aktif/pasif durumu
- hazırlanma süresi
- alerjen bilgileri

tanımlanacaktır.

---

## 5.2 Ürün Kategorileri

Örnek:

- Pastalar
- Yaş Pastalar
- Kuru Pastalar
- Ekmek
- Simit
- Poğaça
- Tatlılar
- İçecekler

Kategori bazlı yönetim yapılacaktır.

---

# 6. Ürün Özelleştirme Sistemi

Özellikle pasta ürünleri için müşteri özelleştirme yapabilecektir.

## Desteklenecek Özelleştirmeler

- gramaj
- kişi sayısı
- aroma seçimi
- iç malzeme
- dış kaplama
- yazı yazılması
- mum ekleme
- ekstra malzeme

---

## Özel Pasta Notu

Müşteri sipariş sırasında not yazabilecektir.

Örnek:

> “İyi ki doğdun Ayşe”

---

# 7. Alerjen ve İçerik Sistemi

Her ürün için alerjen bilgileri tanımlanacaktır.

## Desteklenecek Alerjenler

- gluten
- süt
- yumurta
- fındık
- fıstık
- ceviz
- susam

Ürün detay ekranında gösterilecektir.

---

# 8. Günlük ve Saatlik Stok Sistemi

Fırın ürünleri için dinamik stok yönetimi olacaktır.

## Örnek Senaryolar

- Simit → sabah satışta
- Poğaça → öğlene kadar
- Ekmek → belirli saatlerde yeniden stok

---

## Sistem Özellikleri

- ürün bazlı günlük stok
- saatlik stok yönetimi
- stok bittiğinde otomatik pasif
- yeniden stok ekleme
- stok hareket geçmişi

---

# 9. Sipariş Sistemi

## 9.1 Sepet Sistemi

Müşteri:

- ürün ekleme
- ürün silme
- adet değiştirme

işlemlerini yapabilecektir.

---

## 9.2 Sipariş Türleri

Müşteri sipariş verirken:

### Adrese Teslim

Kurye teslimatı yapılacaktır.

### Mağazadan Teslim Al (Gel-Al)

Müşteri mağazadan siparişi teslim alacaktır.

---

## 9.3 Sipariş Durumları

- Yeni Sipariş
- Onaylandı
- Hazırlanıyor
- Hazır
- Kuryeye Verildi
- Yolda
- Teslim Edildi
- İptal Edildi

---

## 9.4 Sipariş Durum Geçmişi

Her durum değişikliği kayıt altına alınacaktır.

Örnek:

| Durum | Tarih |
|---|---|
| Yeni Sipariş | 12:01 |
| Onaylandı | 12:03 |
| Hazırlanıyor | 12:05 |
| Yolda | 12:25 |
| Teslim Edildi | 12:48 |

---

# 10. Ödeme Sistemi

## İyzico Entegrasyonu

Desteklenecek:

- kredi kartı
- banka kartı

---

## Ödeme Sonrası

Başarılı ödeme sonrası:

- sipariş oluşturulacak
- stok düşülecek
- sipariş operasyon ekranına düşecek

---

# 11. Kurye Sistemi

## 11.1 Kurye Yönetimi

Admin:

- kurye ekleyebilecek
- aktif/pasif yapabilecek

---

## 11.2 Sipariş Atama

Hazırlanan siparişler:

- manuel olarak
- uygun kuryeye

atanacaktır.

---

## 11.3 Kurye Paneli

Kurye görebilecek:

- müşteri bilgileri
- adres
- sipariş içeriği
- sipariş notu
- teslimat durumu

---

## 11.4 Teslimat Takibi

Kurye:

- teslim edildi
- teslim edilemedi

işaretleyebilecektir.

---

## 11.5 Kurye Performans Takibi

Admin görebilecek:

- teslimat süresi
- günlük teslim sayısı
- ortalama teslim süresi

---

# 12. Sadakat Puan Sistemi

## 12.1 QR Kod Sistemi

Her müşteriye özel QR kod üretilecektir.

---

## 12.2 Mağaza İçi Puan Kazanımı

Kasiyer:

- müşterinin QR kodunu okutacak
- alışveriş tutarı üzerinden puan tanımlanacak

---

## 12.3 Puan Kullanımı

Müşteri:

- online siparişlerde
- mağaza alışverişlerinde

puan kullanabilecektir.

---

## 12.4 Puan Hareketleri

Kayıt tutulacaktır:

- kazanılan puan
- kullanılan puan
- manuel ekleme/çıkarma

---

# 13. Adres Sistemi

Her müşteri:

- birden fazla adres kaydedebilecek

## Adres Alanları

- il
- ilçe
- mahalle
- açık adres
- apartman
- kat
- daire
- adres tarifi

---

# 14. Bildirim Sistemi

## Push Notification

- sipariş alındı
- hazırlanıyor
- yolda
- teslim edildi
- kampanya

---

## SMS

- OTP
- kritik sipariş bildirimleri

---

## E-mail

- sipariş özeti
- şifre sıfırlama

---

# 15. Yetkilendirme Sistemi

Menü bazlı ve modül bazlı olacaktır.

Örnek:

| Modül | Yetki |
|---|---|
| Sipariş Yönetimi | Görüntüle |
| Ürün Yönetimi | Düzenle |
| Raporlama | Görüntüle |

---

# 16. Ürün Yorum ve Puanlama Sistemi

## 16.1 Yorum Yapma Yetkisi

Sadece ilgili ürünü satın almış ve siparişi tamamlanmış müşteriler yorum yapabilecektir.

Sipariş durumu:

- Teslim Edildi

olan siparişlerdeki ürünler için yorum yapılabilecektir.

---

## 16.2 Ürün Puanlama

Müşteriler ürünlere:

- 1 ile 5 yıldız arasında puan

verebilecektir.

---

## 16.3 Ürün Yorumu

Müşteriler:

- ürün deneyimi
- tat
- tazelik
- teslimat deneyimi

gibi konularda yorum yazabilecektir.

---

## 16.4 Yönetim Paneli Yorum Yönetimi

Admin panelinden:

- yorumları görüntüleme
- yorum onaylama/reddetme
- yorumu yayından kaldırma
- uygunsuz yorumları silme

işlemleri yapılabilecektir.

---

## 16.5 Ürün Ortalama Puanı

Her ürün için:

- ortalama puan
- toplam yorum sayısı

ürün detay sayfasında gösterilecektir.

---

# 17. Raporlama Sistemi

## Raporlar

- günlük satış
- ürün bazlı satış
- kategori bazlı satış
- en çok satan ürünler
- kurye performansı
- müşteri sipariş istatistikleri
- sadakat puanı kullanımı

---

# 18. Audit Log Sistemi

Sistem kayıt tutacaktır:

- kim ürün düzenledi
- kim fiyat değiştirdi
- kim sipariş iptal etti
- kim stok değiştirdi

---

# 19. Dosya ve Görsel Yönetimi

Ürün görselleri için:

- çoklu görsel
- optimize edilmiş görsel
- mobil uyumlu görsel
- WebP dönüşümü

desteklenecektir.

---

# 20. Teknik Mimari

## Genel Yapı

Tek merkezi backend kullanılacaktır.

Tüm platformlar aynı API’yi kullanacaktır.

---

## Sistem Bileşenleri

- Backend API
- Web Frontend
- Admin Panel
- Android App
- iOS App
- Kurye Paneli
- Veritabanı
- Dosya Depolama
- SMS Servisi
- Push Notification Servisi

---

# 21. Gelecekte Eklenebilecek Özellikler

- kampanya sistemi
- kupon sistemi
- çoklu şube
- canlı kurye haritası
- online canlı destek
- müşteri yorum sistemi
- favori ürünler
- tekrar sipariş
- özel gün kampanyaları
- doğum günü puanı
- toplu sipariş sistemi

---

# 22. MVP (İlk Yayın) Kapsamı

İlk sürümde bulunacak:

- üyelik sistemi
- ürün yönetimi
- kategori yönetimi
- sepet
- ödeme
- sipariş yönetimi
- kurye atama
- teslimat takibi
- mağazadan teslim al
- sadakat puanı
- QR sistemi
- rol bazlı yetkilendirme
- mobil uygulamalar
- yönetim paneli

---

# 23. Projenin Genel Hedefi

Bu sistem;

sadece bir e-ticaret sitesi değil,

aynı zamanda:

- satış,
- operasyon,
- kurye,
- müşteri sadakati,
- mağaza yönetimi

süreçlerini merkezi olarak yöneten profesyonel bir pastane/fırın platformu olacaktır.

