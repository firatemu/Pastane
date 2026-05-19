import { z } from 'zod';
import type { ProductOptionGroup } from './types';

export function buildCustomizationSchema(groups: ProductOptionGroup[]) {
  return z.object({
    quantity: z.number().int().min(1, 'Adet en az 1 olmalı.'),
    note: z.string().max(240, 'Not 240 karakteri aşamaz.').optional(),
    selections: z.record(z.string(), z.array(z.string())).superRefine((value, ctx) => {
      for (const group of groups) {
        const selected = value[group.id] ?? [];
        if (group.isRequired && selected.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${group.name} seçimi zorunludur.`, path: [group.id] });
        }
        if (!group.isMultiple && selected.length > 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${group.name} için yalnızca bir seçim yapılabilir.`, path: [group.id] });
        }
        const allowed = new Set(group.options.filter((option) => option.isActive).map((option) => option.id));
        if (selected.some((optionId) => !allowed.has(optionId))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${group.name} için geçersiz seçim.`, path: [group.id] });
        }
      }
    }),
  });
}
