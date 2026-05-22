'use client';

import { type JSX } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { CampaignRow } from '../../lib/operations/types';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
} from '../shared/admin-form-controls';

/** Safely extract a string message from a react-hook-form FieldError value. */
function errMsg(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  return undefined;
}

export function CampaignFormSheet({
  open,
  editing,
  form,
  onClose,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: CampaignRow | null;
  form: UseFormReturn<any>;
  onClose: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}>): JSX.Element | null {
  if (!open) return null;

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
        aria-labelledby="campaign-form-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <h2 id="campaign-form-title" className="font-display text-xl font-semibold text-on-surface">
              {editing ? 'Kampanya Düzenle' : 'Yeni Kampanya Oluştur'}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Kampanya adını, indirim oranını veya tutarını, başlangıç/bitiş zamanlamalarını ayarlayın.
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

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <Field label="Kampanya Adı" error={errMsg(form.formState.errors.name?.message)}>
              <input className={adminInputClass} placeholder="Örn: Hafta Sonu Gurme İndirimi" {...form.register('name')} />
            </Field>

            <Field label="Açıklama" error={errMsg(form.formState.errors.description?.message)}>
              <input className={adminInputClass} placeholder="Kampanyanın kısa açıklaması..." {...form.register('description')} />
            </Field>

            <Field label="İndirim Türü" error={errMsg(form.formState.errors.type?.message)}>
              <select className={adminSelectClass} {...form.register('type')}>
                <option value="PERCENT">Yüzde (%) İndirimi</option>
                <option value="FIXED">Sabit Tutar (TL) İndirimi</option>
              </select>
            </Field>

            <Field label="İndirim Değeri" error={errMsg(form.formState.errors.value?.message)}>
              <input
                type="number"
                step="0.01"
                className={adminInputClass}
                placeholder="Örn: 15"
                {...form.register('value', { valueAsNumber: true })}
              />
            </Field>

            <Field label="Durum" error={errMsg(form.formState.errors.status?.message)}>
              <select className={adminSelectClass} {...form.register('status')}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
              </select>
            </Field>

            <Field label="Başlangıç Tarihi" error={errMsg(form.formState.errors.startDate?.message)}>
              <input type="date" className={adminInputClass} {...form.register('startDate')} />
            </Field>

            <Field label="Bitiş Tarihi (İsteğe Bağlı)" error={errMsg(form.formState.errors.endDate?.message)}>
              <input type="date" className={adminInputClass} {...form.register('endDate')} />
            </Field>
          </div>

          <footer className="flex gap-3 border-t border-outline-variant/40 px-6 py-4">
            <button type="button" className={`${adminSecondaryButtonClass} flex-1`} onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className={`${adminPrimaryButtonClass} flex-1`} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Kaydet
                </>
              )}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}
