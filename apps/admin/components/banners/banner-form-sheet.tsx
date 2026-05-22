'use client';

import { type JSX } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { BannerFormValues, AdminBanner } from '../../lib/banners/schemas';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

export function BannerFormSheet({
  open,
  editing,
  form,
  onClose,
  onSubmit,
  uploadSlot,
  mediaType,
  desktopMediaUrl,
  mobileMediaUrl,
  uploadErr,
  formValidationHints,
}: Readonly<{
  open: boolean;
  editing: AdminBanner | null;
  form: UseFormReturn<BannerFormValues>;
  onClose: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  uploadSlot: (slot: 'desktop' | 'mobile', file: File | null) => Promise<void>;
  mediaType: 'IMAGE' | 'VIDEO';
  desktopMediaUrl: string;
  mobileMediaUrl: string;
  uploadErr: string | null;
  formValidationHints: string[];
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
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-lg flex-col border-l border-outline-variant bg-surface-container-lowest shadow-[0_0_40px_rgba(61,43,31,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-form-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <h2 id="banner-form-title" className="font-display text-xl font-semibold text-on-surface">
              {editing ? 'Banner Düzenle' : 'Yeni Banner Ekle'}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Görsel veya video dosyalarını yükleyip başlık, zamanlama ve sıralama atayın.
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
            {formValidationHints.length > 0 ? (
              <div className="rounded-2xl border border-error/20 bg-error-container/45 px-3 py-2.5 text-xs text-error" role="alert">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Kayıt için eksik alanlar:
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {formValidationHints.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-error opacity-90">
                  Masaüstü ve mobil dosyaların her ikisini de yüklemeniz gerekir.
                </p>
              </div>
            ) : null}

            {uploadErr ? (
              <div className="rounded-2xl border border-error/20 bg-error-container/45 px-3 py-2 text-xs text-error font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {uploadErr}
              </div>
            ) : null}

            <Field label="Başlık" error={form.formState.errors.title?.message}>
              <input className={adminInputClass} placeholder="Banner ana başlığı" {...form.register('title')} />
            </Field>

            <Field label="Alt Başlık" error={form.formState.errors.subtitle?.message}>
              <input className={adminInputClass} placeholder="Örn: Lezzetli Gurme Serisi" {...form.register('subtitle')} />
            </Field>

            <Field label="Açıklama" error={form.formState.errors.description?.message}>
              <textarea className={adminTextareaClass} placeholder="Banner detay metni..." rows={2} {...form.register('description')} />
            </Field>

            <Field label="Medya Tipi" error={form.formState.errors.mediaType?.message}>
              <select className={adminSelectClass} {...form.register('mediaType')}>
                <option value="IMAGE">🖼️ Görsel</option>
                <option value="VIDEO">🎥 Video</option>
              </select>
            </Field>

            <div className="grid gap-4 grid-cols-2 items-start">
              {/* Masaüstü Medya Yükleme */}
              <div className="space-y-2">
                <span className="text-[13px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-outline">desktop_windows</span>
                  Masaüstü (16:9)
                </span>
                <div className="relative group flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low hover:border-chocolate/40 transition overflow-hidden shadow-sm">
                  {desktopMediaUrl ? (
                    <>
                      {mediaType === 'IMAGE' ? (
                        <img src={desktopMediaUrl} alt="Masaüstü" className="h-full w-full object-cover" />
                      ) : (
                        <video src={desktopMediaUrl} className="h-full w-full object-cover" muted playsInline />
                      )}
                      <div className="absolute inset-0 bg-chocolate/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition duration-300 text-white p-2">
                        <span className="material-symbols-outlined text-white text-[20px]">upload</span>
                        <span className="text-white text-[10px] font-semibold mt-0.5">Değiştir</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-outline group-hover:text-chocolate">
                      <span className="material-symbols-outlined text-[28px] mb-1">upload</span>
                      <span className="text-[11px] font-bold">Seç</span>
                    </div>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept={mediaType === 'IMAGE' ? 'image/*' : 'video/mp4,video/webm'}
                    onChange={(e) => void uploadSlot('desktop', e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              {/* Mobil Medya Yükleme */}
              <div className="space-y-2">
                <span className="text-[13px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-outline">phone_iphone</span>
                  Mobil (9:16)
                </span>
                <div className="relative group flex aspect-[9/16] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low hover:border-chocolate/40 transition overflow-hidden shadow-sm">
                  {mobileMediaUrl ? (
                    <>
                      {mediaType === 'IMAGE' ? (
                        <img src={mobileMediaUrl} alt="Mobil" className="h-full w-full object-cover" />
                      ) : (
                        <video src={mobileMediaUrl} className="h-full w-full object-cover" muted playsInline />
                      )}
                      <div className="absolute inset-0 bg-chocolate/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition duration-300 text-white p-2">
                        <span className="material-symbols-outlined text-white text-[20px]">upload</span>
                        <span className="text-white text-[10px] font-semibold mt-0.5">Değiştir</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-outline group-hover:text-chocolate">
                      <span className="material-symbols-outlined text-[28px] mb-1">upload</span>
                      <span className="text-[11px] font-bold">Seç</span>
                    </div>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept={mediaType === 'IMAGE' ? 'image/*' : 'video/mp4,video/webm'}
                    onChange={(e) => void uploadSlot('mobile', e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            </div>

            <input type="hidden" {...form.register('desktopMediaUrl')} />
            <input type="hidden" {...form.register('mobileMediaUrl')} />

            <div className="grid gap-3 grid-cols-2">
              <Field label="Buton Metni" error={form.formState.errors.buttonText?.message}>
                <input className={adminInputClass} placeholder="Örn: Keşfet" {...form.register('buttonText')} />
              </Field>
              <Field label="Buton Linki (URL)" error={form.formState.errors.buttonUrl?.message}>
                <input className={adminInputClass} placeholder="Örn: /katalog" {...form.register('buttonUrl')} />
              </Field>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <Field label="Vitrin Sırası" error={form.formState.errors.sortOrder?.message}>
                <input type="number" className={adminInputClass} {...form.register('sortOrder', { valueAsNumber: true })} />
              </Field>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 w-full cursor-pointer hover:bg-surface-container-low transition">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-outline-variant/60 bg-surface-container-lowest text-chocolate focus:ring-secondary/50 focus:ring-2"
                    {...form.register('isActive')}
                  />
                  <span className="text-sm font-semibold text-on-surface select-none">Aktif Vitrin</span>
                </label>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <Field label="Başlangıç Zamanı" error={form.formState.errors.startsAt?.message}>
                <input type="datetime-local" className={adminInputClass} {...form.register('startsAt')} />
              </Field>
              <Field label="Bitiş Zamanı" error={form.formState.errors.endsAt?.message}>
                <input type="datetime-local" className={adminInputClass} {...form.register('endsAt')} />
              </Field>
            </div>
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
