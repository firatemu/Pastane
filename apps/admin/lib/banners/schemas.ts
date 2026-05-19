import { z } from 'zod';

export const bannerFormSchema = z.object({
  title: z.string().min(1, 'Başlık zorunludur.'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  buttonText: z.string().optional(),
  buttonUrl: z
    .string()
    .optional()
    .refine(
      (s) => {
        if (s === undefined || s === null) return true;
        const t = s.trim();
        if (t === '') return true;
        return z.string().url().safeParse(t).success || t.startsWith('/');
      },
      { message: 'Geçerli bir adres (https://…) veya / ile başlayan yol girin' },
    ),
  sortOrder: z.preprocess((val) => {
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : 0;
  }, z.number().int().min(0)),
  isActive: z.boolean(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  desktopMediaUrl: z.string().min(1, 'Masaüstü görsel veya video yükleyin'),
  mobileMediaUrl: z.string().min(1, 'Mobil görsel veya video yükleyin'),
});

export type BannerFormValues = z.output<typeof bannerFormSchema>;

export type AdminBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
  desktopMediaUrl: string;
  desktopMediaBucket: string | null;
  desktopMediaObjectKey: string | null;
  mobileMediaUrl: string;
  mobileMediaBucket: string | null;
  mobileMediaObjectKey: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toIsoDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatSchedule(row: AdminBanner): string {
  const s = row.startsAt ? new Date(row.startsAt).toLocaleString('tr-TR') : null;
  const e = row.endsAt ? new Date(row.endsAt).toLocaleString('tr-TR') : null;
  if (!s && !e) return 'Sınırsız';
  if (s && e) return `${s} – ${e}`;
  if (s) return `Başlangıç ${s}`;
  return `Bitiş ${e ?? ''}`;
}
