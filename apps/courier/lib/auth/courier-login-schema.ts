import { z } from 'zod';

export const courierLoginFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Telefon numarası zorunludur.')
    .regex(/^\d{10,15}$/, 'Telefonu yalnızca rakamla, 10-15 hane girin.'),
  password: z.string().min(1, 'Şifre zorunludur.').min(8, 'Şifre en az 8 karakter olmalıdır.'),
});
