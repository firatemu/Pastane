'use client';

import type { JSX } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { categorySchema } from '../../lib/catalog/schemas';
import type { CategoryNode } from '../../lib/catalog/category-utils';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

type Form = z.input<typeof categorySchema>;

export function CategoryFormSheet({
  open,
  editing,
  form,
  parentOptions,
  onClose,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: { id: string; name: string } | null;
  form: UseFormReturn<Form>;
  parentOptions: CategoryNode[];
  onClose: () => void;
  onSubmit: (values: Form) => Promise<void>;
}>): JSX.Element | null {
  if (!open) return null;

  return (
    <>
      <button type="button" aria-label="Formu kapat" className="fixed inset-0 z-40 bg-chocolate/25 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-outline-variant bg-surface-container-lowest shadow-[0_0_40px_rgba(61,43,31,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <h2 id="category-form-title" className="font-display text-xl font-semibold text-on-surface">
              {editing ? 'Kategoriyi düzenle' : 'Yeni kategori'}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Slug sunucuda adınızdan otomatik üretilir. Üst kategori seçerek menü ağacı oluşturabilirsiniz.
            </p>
          </div>
          <button type="button" className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container" onClick={onClose} aria-label="Kapat">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Kategori adı" error={form.formState.errors.name?.message}>
              <input className={adminInputClass} placeholder="Örn. Pastalar" {...form.register('name')} />
            </Field>
            <Field label="Açıklama" error={form.formState.errors.description?.message}>
              <textarea className={adminTextareaClass} rows={3} placeholder="Müşteri vitrininde görünebilir" {...form.register('description')} />
            </Field>
            <Field label="Görsel URL" error={form.formState.errors.imageUrl?.message}>
              <input className={adminInputClass} placeholder="https://…" {...form.register('imageUrl')} />
            </Field>
            <Field label="Üst kategori" error={form.formState.errors.parentId?.message}>
              <select className={adminSelectClass} {...form.register('parentId')}>
                <option value="">Üst kategori yok (kök)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sıra" error={form.formState.errors.sortOrder?.message as string | undefined}>
                <input type="number" min={0} className={adminInputClass} {...form.register('sortOrder')} />
              </Field>
              <Field label="Durum" error={form.formState.errors.isActive?.message as string | undefined}>
                <select
                  className={adminSelectClass}
                  value={form.watch('isActive') ? 'true' : 'false'}
                  onChange={(e) => form.setValue('isActive', e.target.value === 'true', { shouldDirty: true })}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </Field>
            </div>
          </div>
          <footer className="flex gap-3 border-t border-outline-variant/40 px-6 py-4">
            <button type="button" className={`${adminSecondaryButtonClass} flex-1`} onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className={`${adminPrimaryButtonClass} flex-1`} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}
