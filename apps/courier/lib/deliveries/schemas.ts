import { z } from 'zod';

export const failDeliverySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Teslim edilememe nedeni zorunludur.')
    .min(3, 'Neden en az 3 karakter olmalıdır.')
    .max(500, 'En fazla 500 karakter.'),
});
