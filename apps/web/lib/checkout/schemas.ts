import { z } from 'zod';
export const checkoutSchema = z.object({
  deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
  addressId: z.string().optional(),
  pickupStoreId: z.string().optional(),
  note: z.string().max(500, 'Sipariş notu en fazla 500 karakter olabilir.').optional(),
  cardHolderName: z.string().min(2, 'Kart sahibinin adı gerekli.'),
  cardNumber: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'Kart numarası tam 16 hane olmalıdır.')),
  expireMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Ay 01–12 arasında iki hane olmalıdır.'),
  expireYear: z.string().regex(/^\d{2}$/, 'Yıl iki hane olmalıdır (ör. 28).'),
  cvc: z.string().regex(/^\d{3}$/, 'Güvenlik kodu 3 rakam olmalıdır.'),
}).superRefine((value, ctx) => {
  if (value.deliveryType === 'HOME_DELIVERY' && !value.addressId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressId'], message: 'Teslimat adresi seçin.' });
  if (value.deliveryType === 'PICKUP' && !value.pickupStoreId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupStoreId'], message: 'Teslim alma mağazası seçin.' });
});
/** Teslimat alanları (İyzico ödeme yolu kart bilgisini gerektirmez). */
export const checkoutDeliveryOnlySchema = z.object({
  deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
  addressId: z.string().optional(),
  pickupStoreId: z.string().optional(),
  note: z.string().max(500, 'Sipariş notu en fazla 500 karakter olabilir.').optional(),
}).superRefine((value, ctx) => {
  if (value.deliveryType === 'HOME_DELIVERY' && !value.addressId)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressId'], message: 'Teslimat adresi seçin.' });
  if (value.deliveryType === 'PICKUP' && !value.pickupStoreId)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupStoreId'], message: 'Teslim alma mağazası seçin.' });
});
export type CheckoutDeliveryOnlyValues = z.infer<typeof checkoutDeliveryOnlySchema>;
export type CheckoutValues = z.infer<typeof checkoutSchema>;
