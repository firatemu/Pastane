import { z } from 'zod';

const requiredText = 'Bu alan zorunludur.';
const uuidMsg = 'Geçerli bir değer seçin.';

export const rejectReviewSchema = z.object({
  reason: z.string().min(3, 'Red gerekçesi en az 3 karakter olmalıdır.'),
});

export const assignCourierSchema = z.object({
  courierId: z.string().uuid(uuidMsg),
});

const notificationTypes = ['PUSH', 'SMS', 'EMAIL', 'IN_APP'] as const;
export const sendNotificationSchema = z.object({
  userId: z.string().uuid(uuidMsg),
  type: z.enum(notificationTypes),
  title: z.string().min(1, requiredText),
  body: z.string().min(1, requiredText),
  metadataJson: z.string().optional(),
});

export const campaignStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const createCampaignSchema = z.object({
  name: z.string().min(1, requiredText),
  description: z.string().optional(),
  type: z.string().min(1, 'Kampanya türü zorunludur.'),
  value: z.coerce.number().min(0, 'Değer negatif olamaz.'),
  status: campaignStatusSchema,
  startDate: z.string().min(1, 'Başlangıç tarihi zorunludur.'),
  endDate: z.string().optional(),
});
export const updateCampaignSchema = createCampaignSchema.partial();

export const loyaltySettingsFormSchema = z.object({
  earnRate: z.coerce.number().min(0, 'Oran negatif olamaz.'),
  pointValue: z.coerce.number().min(0, 'Puan değeri negatif olamaz.'),
  minimumRedeem: z.coerce.number().int().min(0, 'Minimum kullanım negatif olamaz.'),
  isActive: z.boolean(),
});

export const loyaltyAdjustSchema = z
  .object({
    points: z.coerce.number().int().min(1, 'Puan en az 1 olmalıdır.'),
    userId: z.string().uuid(uuidMsg).optional(),
    qrCode: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .refine((d) => Boolean(d.userId || d.qrCode), {
    message: 'Müşteri kullanıcı kimliği veya sadakat QR kodu gerekir.',
  });

export const systemSettingsSchema = z.object({
  otpActive: z.boolean().optional(),
  deliveryActive: z.boolean().optional(),
  pickupActive: z.boolean().optional(),
  loyaltyActive: z.boolean().optional(),
  paymentActive: z.boolean().optional(),
  minimumOrderValue: z.coerce.number().min(0).optional(),
});

export const settingKeyPatchSchema = z.object({
  key: z.string().min(1, requiredText),
  valueJson: z.string().min(1, 'JSON değeri zorunludur.'),
});

export const adminUserUpdateSchema = z.object({
  firstName: z.string().min(1, requiredText).optional(),
  lastName: z.string().min(1, requiredText).optional(),
  email: z.union([z.literal(''), z.string().email('Geçerli bir e-posta adresi girin.')]).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional(),
});
