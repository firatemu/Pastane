# Pastane & Fırın Platformu
# Backend Rol ve Yetki Matrisi

---

# 1. Roller

Sistemde temel olarak aşağıdaki roller bulunacaktır:

| Rol | Açıklama |
|---|---|
| ADMIN | Tüm yetkilere sahip sistem yöneticisi |
| ORDER_OPERATOR | Sipariş ve operasyon süreçlerini yöneten kullanıcı |
| PRODUCT_MANAGER | Ürün, kategori ve stok süreçlerini yöneten kullanıcı |
| COURIER | Kurye kullanıcısı |
| CUSTOMER | Sipariş veren müşteri |

---

# 2. Yetki Formatı

Yetkiler modül + aksiyon formatında tutulacaktır.

```text
module.action
```

Örnekler:

```text
products.create
products.update
orders.view
orders.updateStatus
reviews.approve
```

---

# 3. Genel Yetki Listesi

## 3.1 Users

| Yetki | Açıklama |
|---|---|
| users.view | Kullanıcıları görüntüleme |
| users.create | Kullanıcı oluşturma |
| users.update | Kullanıcı güncelleme |
| users.delete | Kullanıcı silme |
| users.changeStatus | Kullanıcı durumunu değiştirme |

---

## 3.2 Roles & Permissions

| Yetki | Açıklama |
|---|---|
| roles.view | Rolleri görüntüleme |
| roles.create | Rol oluşturma |
| roles.update | Rol güncelleme |
| roles.delete | Rol silme |
| permissions.view | İzinleri görüntüleme |
| permissions.manage | İzin atama/kaldırma |

---

## 3.3 Products

| Yetki | Açıklama |
|---|---|
| products.view | Ürünleri görüntüleme |
| products.create | Ürün oluşturma |
| products.update | Ürün güncelleme |
| products.delete | Ürün silme |
| products.manageImages | Ürün görsellerini yönetme |
| products.manageOptions | Ürün özelleştirmelerini yönetme |
| products.manageAllergens | Ürün alerjenlerini yönetme |

---

## 3.4 Categories

| Yetki | Açıklama |
|---|---|
| categories.view | Kategori görüntüleme |
| categories.create | Kategori oluşturma |
| categories.update | Kategori güncelleme |
| categories.delete | Kategori silme |

---

## 3.5 Stock

| Yetki | Açıklama |
|---|---|
| stock.view | Stok görüntüleme |
| stock.create | Stok girişi oluşturma |
| stock.update | Stok güncelleme |
| stock.adjust | Manuel stok hareketi |
| stock.viewMovements | Stok hareket geçmişi görüntüleme |

---

## 3.6 Orders

| Yetki | Açıklama |
|---|---|
| orders.view | Siparişleri görüntüleme |
| orders.viewOwn | Kendi siparişlerini görüntüleme |
| orders.create | Sipariş oluşturma |
| orders.updateStatus | Sipariş durumu güncelleme |
| orders.cancel | Sipariş iptal etme |
| orders.assignCourier | Kurye atama |
| orders.viewAll | Tüm siparişleri görüntüleme |

---

## 3.7 Payments

| Yetki | Açıklama |
|---|---|
| payments.view | Ödeme görüntüleme |
| payments.initiate | Ödeme başlatma |
| payments.refund | İade işlemi başlatma |
| payments.viewAll | Tüm ödemeleri görüntüleme |

---

## 3.8 Couriers & Deliveries

| Yetki | Açıklama |
|---|---|
| couriers.view | Kurye görüntüleme |
| couriers.create | Kurye oluşturma |
| couriers.update | Kurye güncelleme |
| couriers.performance | Kurye performans raporu |
| deliveries.viewOwn | Kendi teslimatlarını görüntüleme |
| deliveries.updateOwn | Kendi teslimat durumunu güncelleme |
| deliveries.viewAll | Tüm teslimatları görüntüleme |

---

## 3.9 Loyalty

| Yetki | Açıklama |
|---|---|
| loyalty.viewOwn | Kendi puanlarını görüntüleme |
| loyalty.scan | QR okutarak puan kazandırma |
| loyalty.redeem | Puan kullandırma |
| loyalty.manageSettings | Sadakat ayarlarını yönetme |
| loyalty.viewReports | Sadakat raporlarını görüntüleme |

---

## 3.10 Reviews

| Yetki | Açıklama |
|---|---|
| reviews.create | Ürün yorumu oluşturma |
| reviews.view | Onaylı yorumları görüntüleme |
| reviews.moderate | Yorum onaylama/reddetme |
| reviews.delete | Yorum silme |

---

## 3.11 Notifications

| Yetki | Açıklama |
|---|---|
| notifications.viewOwn | Kendi bildirimlerini görme |
| notifications.send | Bildirim gönderme |
| notifications.manage | Bildirim yönetimi |

---

## 3.12 Campaigns

| Yetki | Açıklama |
|---|---|
| campaigns.view | Kampanyaları görüntüleme |
| campaigns.create | Kampanya oluşturma |
| campaigns.update | Kampanya güncelleme |
| campaigns.delete | Kampanya silme |

---

## 3.13 Settings

| Yetki | Açıklama |
|---|---|
| settings.view | Sistem ayarlarını görüntüleme |
| settings.update | Sistem ayarlarını güncelleme |

---

## 3.14 Reports

| Yetki | Açıklama |
|---|---|
| reports.sales | Satış raporları |
| reports.products | Ürün raporları |
| reports.couriers | Kurye raporları |
| reports.customers | Müşteri raporları |
| reports.loyalty | Sadakat raporları |

---

## 3.15 Audit

| Yetki | Açıklama |
|---|---|
| audit.view | Audit log görüntüleme |

---

# 4. Rol Bazlı Yetki Matrisi

## 4.1 ADMIN

Admin tüm yetkilere sahiptir.

```text
*
```

---

## 4.2 ORDER_OPERATOR

| Modül | Yetkiler |
|---|---|
| orders | orders.viewAll, orders.updateStatus, orders.assignCourier, orders.cancel |
| couriers | couriers.view |
| deliveries | deliveries.viewAll |
| stock | stock.view |
| loyalty | loyalty.scan, loyalty.redeem |
| reviews | reviews.view |
| notifications | notifications.send |
| reports | reports.sales |

---

## 4.3 PRODUCT_MANAGER

| Modül | Yetkiler |
|---|---|
| products | products.view, products.create, products.update, products.manageImages, products.manageOptions, products.manageAllergens |
| categories | categories.view, categories.create, categories.update |
| stock | stock.view, stock.create, stock.update, stock.adjust, stock.viewMovements |
| allergens | allergens.view |
| media | media.upload, media.delete |
| reports | reports.products |

Not:

Ürün silme yetkisi varsayılan olarak sadece ADMIN rolünde olmalıdır.

---

## 4.4 COURIER

| Modül | Yetkiler |
|---|---|
| deliveries | deliveries.viewOwn, deliveries.updateOwn |
| orders | orders.viewOwn |
| notifications | notifications.viewOwn |

Kurye sadece kendisine atanmış teslimatları görmelidir.

---

## 4.5 CUSTOMER

| Modül | Yetkiler |
|---|---|
| products | products.view |
| categories | categories.view |
| cart | cart.manageOwn |
| orders | orders.create, orders.viewOwn, orders.cancel |
| payments | payments.initiate, payments.view |
| addresses | addresses.manageOwn |
| loyalty | loyalty.viewOwn |
| reviews | reviews.create, reviews.view |
| notifications | notifications.viewOwn |

Müşteri sadece kendi verilerine erişebilir.

---

# 5. Endpoint Bazlı Yetki Örnekleri

| Endpoint | Yetki |
|---|---|
| POST `/products` | products.create |
| PATCH `/products/:id` | products.update |
| DELETE `/products/:id` | products.delete |
| GET `/orders` | orders.viewAll |
| GET `/orders/my` | orders.viewOwn |
| PATCH `/orders/:id/status` | orders.updateStatus |
| POST `/orders/:id/assign-courier` | orders.assignCourier |
| PATCH `/reviews/:id/approve` | reviews.moderate |
| GET `/audit` | audit.view |

---

# 6. Guard Kullanım Kararı

Backend tarafında iki seviye koruma kullanılacaktır:

## 6.1 Role Guard

Daha basit rol kontrolü gereken yerlerde:

```ts
@Roles(RoleType.ADMIN, RoleType.ORDER_OPERATOR)
```

## 6.2 Permission Guard

Modül/aksiyon bazlı hassas kontrollerde:

```ts
@Permissions('orders.updateStatus')
```

---

# 7. Veri Sahipliği Kontrolü

Bazı endpointlerde sadece rol yetmez, veri sahipliği de kontrol edilmelidir.

Örnek:

- müşteri sadece kendi siparişini görebilir
- kurye sadece kendisine atanmış teslimatı görebilir
- müşteri sadece kendi adresini silebilir
- müşteri sadece kendi bildirimlerini görebilir

Bu kontroller servis katmanında yapılmalıdır.

---

# 8. Özet

Bu yetki yapısı:

- rol bazlı erişim,
- modül bazlı izin,
- veri sahipliği kontrolü,
- admin/operator/product/courier/customer ayrımı

sağlayacak şekilde tasarlanmıştır.
