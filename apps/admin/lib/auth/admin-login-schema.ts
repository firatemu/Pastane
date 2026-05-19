import { z } from 'zod';

export const adminLoginFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Telefon numarası zorunludur.')
    .regex(/^\d{10,15}$/, 'Telefon numarasını yalnızca rakam olarak, 10-15 hane olacak şekilde girin.'),
  password: z.string().min(1, 'Şifre zorunludur.').min(8, 'Şifre en az 8 karakter olmalıdır.'),
});
