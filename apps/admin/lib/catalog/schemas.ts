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

export const productSchema = z
  .object({
    name: z.string().min(1, requiredText),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    price: z.coerce.number().positive('Geçerli bir fiyat girin.'),
    discountedPrice: z.union([z.coerce.number().positive('Geçerli bir fiyat girin.'), z.literal('')]).optional(),
    categoryId: z.string().uuid(uuidMsg),
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).default('ACTIVE'),
    preparationMinutes: z.union([z.coerce.number().int().positive('Pozitif bir tam sayı girin.'), z.literal('')]).optional(),
    allergenIds: z.array(z.string().uuid(uuidMsg)).default([]),
  })
  .refine((v) => v.discountedPrice === '' || v.discountedPrice === undefined || v.discountedPrice <= v.price, {
    path: ['discountedPrice'],
    message: 'İndirimli fiyat normal fiyatı aşamaz.',
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

export const stockSchema = z
  .object({
    productId: z.string().uuid(uuidMsg),
    date: z.string().min(1, 'Tarih zorunludur.'),
    quantity: z.coerce.number().int().min(0, 'Miktar negatif olamaz.'),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
  })
  .refine((v) => (!v.availableFrom && !v.availableTo) || (!!v.availableFrom && !!v.availableTo), {
    message: 'Saat aralığı iki alanla birlikte girilmelidir.',
    path: ['availableTo'],
  });

/** PATCH: boş saat = mevcut pencereyi değiştirme; ikisi doluysa birlikte güncellenir. */
export const updateStockEntrySchema = z
  .object({
    quantity: z.coerce.number().int().min(0, 'Miktar negatif olamaz.'),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
  })
  .refine((v) => !v.availableFrom && !v.availableTo || (!!v.availableFrom && !!v.availableTo), {
    message: 'Saat aralığı iki alanla birlikte girilmelidir.',
    path: ['availableTo'],
  });

export const movementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().positive('Miktar pozitif bir tam sayı olmalıdır.'),
  note: z.string().optional(),
});
