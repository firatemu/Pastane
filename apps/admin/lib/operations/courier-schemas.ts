import { z } from 'zod';

const phoneRe = /^\d{10,15}$/;

export const createCourierFormSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur.'),
  lastName: z.string().min(1, 'Soyad zorunludur.'),
  phone: z.string().regex(phoneRe, 'Geçerli bir telefon girin (10–15 rakam)'),
  email: z.string().optional(),
  password: z.string().min(8, 'Şifre en az 8 karakter'),
  vehicle: z.string().optional(),
}).refine((data) => {
  const e = data.email?.trim();
  if (!e) return true;
  return z.string().email().safeParse(e).success;
}, { message: 'Geçerli e-posta girin', path: ['email'] });

export const updateCourierFormSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur.'),
  lastName: z.string().min(1, 'Soyad zorunludur.'),
  phone: z.string().regex(phoneRe, 'Geçerli bir telefon girin (10–15 rakam)'),
  email: z.string().optional(),
  newPassword: z.string().optional(),
  vehicle: z.string().optional(),
}).refine((data) => {
  const e = data.email?.trim();
  if (!e) return true;
  return z.string().email().safeParse(e).success;
}, { message: 'Geçerli e-posta girin', path: ['email'] }).refine((data) => !data.newPassword || data.newPassword.length === 0 || data.newPassword.length >= 8, {
  message: 'Yeni şifre en az 8 karakter olmalı',
  path: ['newPassword'],
});

export type CreateCourierForm = z.infer<typeof createCourierFormSchema>;
export type UpdateCourierForm = z.infer<typeof updateCourierFormSchema>;
