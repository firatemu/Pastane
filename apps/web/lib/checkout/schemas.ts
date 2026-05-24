import { z } from 'zod';

/** Müşteri ödeme formu — yalnızca teslimat; ödeme iyzico checkout formu ile tamamlanır. */
export const checkoutDeliveryOnlySchema = z
  .object({
    deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
    addressId: z.string().optional(),
    pickupStoreId: z.string().optional(),
    note: z.string().max(500, 'Sipariş notu en fazla 500 karakter olabilir.').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.deliveryType === 'HOME_DELIVERY' && !value.addressId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressId'], message: 'Teslimat adresi seçin.' });
    }
    if (value.deliveryType === 'PICKUP' && !value.pickupStoreId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupStoreId'], message: 'Teslim alma mağazası seçin.' });
    }
  });

export type CheckoutDeliveryOnlyValues = z.infer<typeof checkoutDeliveryOnlySchema>;
