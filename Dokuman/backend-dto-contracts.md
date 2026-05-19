# Pastane & Fırın Platformu
# Backend DTO ve Request/Response Alan Planı

---

# 1. Amaç

Bu doküman kodlamaya başlamadan önce DTO dosyalarının ana alanlarını belirler.

NestJS tarafında her DTO class-validator ve class-transformer ile doğrulanmalıdır.

---

# 2. Auth DTO

## RegisterDto

```ts
firstName: string
lastName: string
phone: string
email?: string
password: string
```

## LoginDto

```ts
identifier: string // phone veya email
password: string
```

## RefreshTokenDto

```ts
refreshToken: string
```

## VerifyPhoneDto

```ts
phone: string
code: string
```

---

# 3. User DTO

## UpdateProfileDto

```ts
firstName?: string
lastName?: string
email?: string
```

## ChangePasswordDto

```ts
currentPassword: string
newPassword: string
```

## UpdateUserStatusDto

```ts
status: UserStatus
```

---

# 4. Address DTO

## CreateAddressDto

```ts
title: string
city: string
district: string
neighborhood?: string
fullAddress: string
building?: string
floor?: string
apartment?: string
directions?: string
isDefault?: boolean
```

## UpdateAddressDto

Aynı alanların tamamı optional olacaktır.

---

# 5. Category DTO

## CreateCategoryDto

```ts
name: string
description?: string
imageUrl?: string
parentId?: string
sortOrder?: number
isActive?: boolean
```

## UpdateCategoryDto

Tüm alanlar optional.

---

# 6. Product DTO

## CreateProductDto

```ts
name: string
description?: string
shortDescription?: string
price: number
discountedPrice?: number
categoryId: string
status?: ProductStatus
preparationMinutes?: number
allergenIds?: string[]
```

## UpdateProductDto

Tüm alanlar optional.

## QueryProductDto

```ts
page?: number
limit?: number
search?: string
categoryId?: string
status?: ProductStatus
minPrice?: number
maxPrice?: number
sortBy?: string
sortOrder?: 'asc' | 'desc'
```

## CreateOptionGroupDto

```ts
name: string
isRequired?: boolean
isMultiple?: boolean
sortOrder?: number
```

## CreateOptionDto

```ts
name: string
priceModifier?: number
isActive?: boolean
sortOrder?: number
```

---

# 7. Stock DTO

## CreateStockEntryDto

```ts
productId: string
date: string
quantity: number
availableFrom?: string // HH:mm
availableTo?: string // HH:mm
```

## UpdateStockEntryDto

```ts
quantity?: number
availableFrom?: string
availableTo?: string
```

## StockMovementDto

```ts
type: StockMovementType
quantity: number
note?: string
```

---

# 8. Cart DTO

## AddToCartDto

```ts
productId: string
quantity: number
optionIds?: string[]
customNote?: string
```

## UpdateCartItemDto

```ts
quantity?: number
optionIds?: string[]
customNote?: string
```

---

# 9. Order DTO

## CreateOrderDto

```ts
deliveryType: DeliveryType
addressId?: string
pickupStoreId?: string
scheduledAt?: string
note?: string
loyaltyPointsUsed?: number
```

Kurallar:

- HOME_DELIVERY ise addressId zorunlu
- PICKUP ise pickupStoreId zorunlu
- loyaltyPointsUsed varsa müşterinin yeterli puanı olmalı

---

## UpdateOrderStatusDto

```ts
status: OrderStatus
note?: string
```

## AssignCourierDto

```ts
courierId: string
```

## CancelOrderDto

```ts
reason: string
```

## QueryOrderDto

```ts
page?: number
limit?: number
status?: OrderStatus
deliveryType?: DeliveryType
startDate?: string
endDate?: string
search?: string
```

---

# 10. Payment DTO

## InitiatePaymentDto

```ts
orderId: string
cardHolderName: string
cardNumber: string
expireMonth: string
expireYear: string
cvc: string
```

Not:

Kart bilgileri sistemde saklanmamalıdır.

---

## PaymentCallbackDto

İyzico callback alanlarına göre netleşecektir.

Temel alanlar:

```ts
paymentId: string
conversationId: string
status: string
token?: string
```

## RefundPaymentDto

```ts
reason: string
amount?: number
```

---

# 11. Courier DTO

## CreateCourierDto

```ts
userId: string
vehicle?: string
status?: CourierStatus
```

## UpdateCourierDto

```ts
vehicle?: string
status?: CourierStatus
```

---

# 12. Delivery DTO

## UpdateDeliveryStatusDto

```ts
status: DeliveryStatus
failedReason?: string
```

---

# 13. Delivery Zone DTO

## CreateDeliveryZoneDto

```ts
name: string
minimumOrderPrice?: number
deliveryFee: number
estimatedMinutes?: number
isActive?: boolean
```

## UpdateDeliveryZoneDto

Tüm alanlar optional.

---

# 14. Loyalty DTO

## EarnPointsDto

```ts
qrCode: string
amount: number
note?: string
```

## RedeemPointsDto

```ts
userId: string
points: number
note?: string
```

## UpdateLoyaltySettingsDto

```ts
earnRate?: number
pointValue?: number
minimumRedeem?: number
isActive?: boolean
```

---

# 15. Review DTO

## CreateReviewDto

```ts
orderItemId: string
rating: number
comment?: string
```

Kurallar:

- rating 1-5 arası olmalı
- orderItem müşteriye ait olmalı
- sipariş DELIVERED olmalı
- aynı orderItem için ikinci yorum olmamalı

## ModerateReviewDto

```ts
status: ReviewStatus
rejectedReason?: string
```

---

# 16. Media DTO

## UploadMediaDto

```ts
folder?: string
altText?: string
productId?: string
```

Dosya multipart/form-data ile alınacaktır.

---

# 17. Campaign DTO

## CreateCampaignDto

```ts
name: string
description?: string
type: string
value: number
startDate: string
endDate?: string
isActive?: boolean
```

---

# 18. Setting DTO

## UpdateSettingDto

```ts
value: string | number | boolean | object
```

---

# 19. Report Filter DTO

```ts
startDate?: string
endDate?: string
groupBy?: 'day' | 'week' | 'month'
```

---

# 20. Genel Validasyon Kuralları

- Tüm UUID alanları UUID validasyonundan geçmelidir.
- Tüm para alanları pozitif olmalıdır.
- quantity en az 1 olmalıdır.
- rating 1-5 arası olmalıdır.
- saat alanları HH:mm formatında olmalıdır.
- tarih alanları ISO string olmalıdır.
- telefon numarası normalize edilmelidir.

---

# 21. Özet

Bu DTO planı backend kodlamasına başlamadan önce ana request/response sözleşmesini netleştirir.

Kodlama sırasında DTO’lar bu doküman temel alınarak detaylandırılacaktır.
