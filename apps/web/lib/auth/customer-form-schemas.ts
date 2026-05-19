import { z } from 'zod';

export const customerLoginFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Telefon numarası zorunludur.')
    .regex(/^\d{10,15}$/, 'Telefon numarasını yalnızca rakam olarak, 10-15 hane olacak şekilde girin.'),
  password: z.string().min(1, 'Şifre zorunludur.').min(8, 'Şifre en az 8 karakter olmalıdır.'),
});

export const customerRegisterFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Ad zorunludur.'),
  lastName: z.string().trim().min(1, 'Soyad zorunludur.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Telefon numarası zorunludur.')
    .regex(/^\d{10,15}$/, 'Telefon numarasını yalnızca rakam olarak, 10-15 hane olacak şekilde girin.'),
  email: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Geçerli bir e-posta adresi girin.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
});

export type CustomerLoginFormValues = z.infer<typeof customerLoginFormSchema>;
export type CustomerRegisterFormValues = z.infer<typeof customerRegisterFormSchema>;
