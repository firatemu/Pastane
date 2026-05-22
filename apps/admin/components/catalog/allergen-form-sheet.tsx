'use client';

import { useEffect } from 'react';
import type { JSX } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { allergenSchema } from '../../lib/catalog/schemas';
 
import { adminInputClass } from '../shared/admin-form-controls';
 
import { adminPrimaryButtonClass } from '../shared/admin-form-controls';
 
import { adminSecondaryButtonClass } from '../shared/admin-form-controls';
import { Field } from '../shared/form-field';

type Form = z.input<typeof allergenSchema>;

function getAllergenIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('gluten')) return '🌾';
  if (lowerName.includes('süt') || lowerName.includes('laktoz')) return '🥛';
  if (lowerName.includes('yumurta')) return '🥚';
  if (lowerName.includes('fındık')) return '🌰';
  if (lowerName.includes('fıstık')) return '🥜';
  if (lowerName.includes('ceviz')) return '🌳';
  if (lowerName.includes('susam')) return '🫘';
  if (lowerName.includes('soya')) return '🫘';
  if (lowerName.includes('balık')) return '🐟';
  if (lowerName.includes('kabuk')) return '🦐';
  return '⚠️';
}

interface AllergenFormSheetProps {
  open: boolean;
  editing: { id: string; name: string } | null;
  form: UseFormReturn<Form>;
  onClose: () => void;
  onSubmit: (values: Form) => Promise<void>;
}

export function AllergenFormSheet({
  open,
  editing,
  form,
  onClose,
  onSubmit,
}: Readonly<AllergenFormSheetProps>): JSX.Element | null {
  useEffect(() => {
    if (open && editing) {
      form.reset({ name: editing.name });
    } else if (open && !editing) {
      form.reset({ name: '' });
    }
  }, [open, editing, form]);

  if (!open) return null;

  const currentName = (form.watch('name') ?? editing?.name ?? '') as string;

  return (
    <>
      <button
        type="button"
        aria-label="Formu kapat"
        className="fixed inset-0 z-[60] bg-chocolate/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-outline-variant bg-surface-container-lowest shadow-[0_0_40px_rgba(61,43,31,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="allergen-form-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <h2 id="allergen-form-title" className="font-display text-xl font-semibold text-on-surface">
              {editing ? 'Alerjen düzenle' : 'Yeni alerjen'}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Alerjen adını girin; ürün detaylarında müşterilere gösterilir.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3">
              <span className="text-4xl">{getAllergenIcon(currentName)}</span>
              <div>
                <p className="font-medium text-on-surface">{currentName || 'Alerjen Adı'}</p>
                <p className="text-xs text-on-surface-variant">Otomatik ikon eşleştirme</p>
              </div>
            </div>

            <Field label="Alerjen adı" error={form.formState.errors.name?.message}>
              <input
                className={adminInputClass}
                placeholder="örn. Gluten, Süt, Yumurta"
                {...form.register('name')}
              />
            </Field>

            <div className="rounded-xl border border-secondary-container/50 bg-secondary-container/20 px-4 py-3">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-secondary">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Bilgilendirme
              </h4>
              <ul className="space-y-1 text-sm text-secondary">
                <li>• Alerjenler ürünlerle ilişkilendirilebilir</li>
                <li>• Müşteriler ürün detayında alerjenleri görür</li>
                <li>• Silinen alerjenler ürünlerden otomatik kaldırılır</li>
              </ul>
            </div>
          </div>

          <footer className="flex gap-3 border-t border-outline-variant/40 px-6 py-4">
            <button type="button" className={`${adminSecondaryButtonClass} flex-1`} onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className={`${adminPrimaryButtonClass} flex-1`} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Ekle'}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}