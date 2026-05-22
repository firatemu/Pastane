import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().trim().min(10, 'Telefon en az 10 hane olmalı.').max(15),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Ad zorunlu.'),
  lastName: z.string().trim().min(1, 'Soyad zorunlu.'),
  phone: z.string().trim().min(10).max(15),
  email: z.string().trim().email('Geçerli e-posta girin.').optional().or(z.literal('')),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
});

export const addressSchema = z.object({
  title: z.string().trim().min(1, 'Başlık zorunlu.'),
  city: z.string().trim().min(1, 'İl zorunlu.'),
  district: z.string().trim().min(1, 'İlçe zorunlu.'),
  neighborhood: z.string().trim().optional(),
  fullAddress: z.string().trim().min(5, 'Adres zorunlu.'),
  building: z.string().trim().optional(),
  floor: z.string().trim().optional(),
  apartment: z.string().trim().optional(),
  directions: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export const checkoutSchema = z
  .object({
    deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
    addressId: z.string().optional(),
    pickupStoreId: z.string().optional(),
    note: z.string().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType === 'HOME_DELIVERY' && !v.addressId) {
      ctx.addIssue({ code: 'custom', message: 'Teslimat adresi seçin.', path: ['addressId'] });
    }
    if (v.deliveryType === 'PICKUP' && !v.pickupStoreId) {
      ctx.addIssue({ code: 'custom', message: 'Mağaza seçin.', path: ['pickupStoreId'] });
    }
  });

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
