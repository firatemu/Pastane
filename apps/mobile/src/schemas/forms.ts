import { z } from 'zod';

function optionalStringField(maxLen: number): z.ZodType<string | undefined> {
  return z.preprocess((val) => {
    if (typeof val !== 'string') return undefined;
    const t = val.trim();
    return t === '' ? undefined : t;
  }, z.string().max(maxLen).optional()) as z.ZodType<string | undefined>;
}

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

/** Adres formu; varsayılan adres liste ekranından ayarlanır (`isDefault` burada yok). */
export const addressSchema = z.object({
  title: z.string().trim().min(1, 'Başlık zorunlu.'),
  city: z.string().trim().min(1, 'İl zorunlu.'),
  district: z.string().trim().min(1, 'İlçe zorunlu.'),
  neighborhood: optionalStringField(120),
  fullAddress: z
    .string()
    .trim()
    .min(1, 'Açık adres zorunlu.')
    .min(5, 'Açık adres en az 5 karakter olmalı.'),
  building: optionalStringField(120),
  floor: optionalStringField(60),
  apartment: optionalStringField(60),
  directions: optionalStringField(2000),
});

export const checkoutSchema = z
  .object({
    deliveryType: z.enum(['HOME_DELIVERY', 'PICKUP']),
    addressId: z.string().optional(),
    pickupStoreId: z.string().optional(),
    note: z.string().max(500).optional(),
    scheduledAt: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType === 'HOME_DELIVERY' && !v.addressId) {
      ctx.addIssue({ code: 'custom', message: 'Teslimat adresi seçin.', path: ['addressId'] });
    }
    if (v.deliveryType === 'PICKUP' && !v.pickupStoreId) {
      ctx.addIssue({ code: 'custom', message: 'Mağaza seçin.', path: ['pickupStoreId'] });
    }
  });

/** Web `checkoutSchema` kart alanları — mobil `payments/initiate` ile hizalı. */
export const mobileCardPaymentSchema = z.object({
  cardHolderName: z.string().trim().min(2, 'Kart sahibinin adı gerekli.'),
  cardNumber: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'Kart numarası tam 16 hane olmalıdır.')),
  expireMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Ay 01–12 arasında iki hane olmalıdır.'),
  expireYear: z.string().regex(/^\d{2}$/, 'Yıl iki hane olmalıdır (ör. 30).'),
  cvc: z.string().regex(/^\d{3}$/, 'Güvenlik kodu 3 rakam olmalıdır.'),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre zorunlu.'),
    newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalı.'),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Yeni şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });
