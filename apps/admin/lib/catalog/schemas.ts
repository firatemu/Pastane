import { z } from 'zod';

const requiredText = 'Bu alan zorunludur.';
const uuidMsg = 'Geçerli bir seçim yapın.';

export const categorySchema = z.object({
  name: z.string().min(1, requiredText),
  description: z.string().optional(),
  imageUrl: z
    .string()
    .url('Geçerli bir adres (URL) girin.')
    .optional()
    .or(z.literal('')),
  parentId: z.string().uuid(uuidMsg).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const allergenSchema = z.object({
  name: z.string().min(1, requiredText),
});

export const productUnitSchema = z.object({
  name: z.string().min(1, requiredText),
  symbol: z
    .string()
    .min(1, requiredText)
    .regex(/^[a-z0-9]+$/i, 'Kısaltma yalnızca harf ve rakam içerebilir.'),
  kind: z.enum(['COUNT', 'WEIGHT', 'VOLUME']).default('COUNT'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().min(1, requiredText),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    price: z.coerce.number().positive('Geçerli bir fiyat girin.'),
    discountedPrice: z.union([z.coerce.number().positive('Geçerli bir fiyat girin.'), z.literal('')]).optional(),
    categoryId: z.string().uuid(uuidMsg),
    unitId: z.string().uuid(uuidMsg),
    unitQuantity: z.union([z.coerce.number().positive('Geçerli bir miktar girin.'), z.literal('')]).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    isPublished: z.boolean().default(true),
    saleWindowStart: z.string().optional(),
    saleWindowEnd: z.string().optional(),
    preparationMinutes: z.union([z.coerce.number().int().positive('Pozitif bir tam sayı girin.'), z.literal('')]).optional(),
    allergenIds: z.array(z.string().uuid(uuidMsg)).default([]),
  })
  .refine((v) => v.discountedPrice === '' || v.discountedPrice === undefined || v.discountedPrice <= v.price, {
    path: ['discountedPrice'],
    message: 'İndirimli fiyat normal fiyatı aşamaz.',
  })
  .refine((v) => (!v.saleWindowStart && !v.saleWindowEnd) || (!!v.saleWindowStart && !!v.saleWindowEnd), {
    message: 'Satış saati iki alanla birlikte girilmelidir.',
    path: ['saleWindowEnd'],
  });

export const optionGroupSchema = z.object({
  name: z.string().min(1, requiredText),
  isRequired: z.boolean().default(false),
  isMultiple: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const optionSchema = z.object({
  name: z.string().min(1, requiredText),
  priceModifier: z.coerce.number().min(0, 'Fiyat farkı negatif olamaz.').default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const storeSchema = z.object({
  name: z.string().min(1, requiredText),
  phone: z.string().optional(),
  city: z.string().min(1, requiredText),
  district: z.string().min(1, requiredText),
  address: z.string().min(1, requiredText),
  latitude: z.union([z.coerce.number().min(-90).max(90), z.literal('')]).optional(),
  longitude: z.union([z.coerce.number().min(-180).max(180), z.literal('')]).optional(),
  isActive: z.boolean().default(true),
});

export const zoneSchema = z.object({
  name: z.string().min(1, requiredText),
  minimumOrderPrice: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  deliveryFee: z.coerce.number().min(0, 'Teslimat ücreti negatif olamaz.'),
  estimatedMinutes: z.union([z.coerce.number().int().positive('Tahmini süre pozitif olmalıdır.'), z.literal('')]).optional(),
  isActive: z.boolean().default(true),
});
