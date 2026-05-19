import { z } from 'zod';
export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Puan 1 ile 5 arasında olmalı.').max(5, 'Puan 1 ile 5 arasında olmalı.'),
  comment: z.string().max(1000, 'Yorum en fazla 1000 karakter olabilir.').optional(),
});
export type ReviewValues = z.infer<typeof reviewSchema>;
