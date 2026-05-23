'use client';

import { useEffect, useState, type JSX } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { productSchema } from '../../lib/catalog/schemas';
import type { Allergen, Category, Product, ProductUnit } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { PRODUCT_STATUS_LABELS } from './product-status-pill';
import { ProductMediaPanel } from './product-media-panel';
import { ProductOptionsPanel } from './product-options-panel';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

type Form = z.input<typeof productSchema>;
type TabId = 'details' | 'media' | 'options';

export function ProductFormSheet({
  open,
  editing,
  form,
  categories,
  allergens,
  units,
  permissions,
  onClose,
  onSubmit,
  onChanged,
}: Readonly<{
  open: boolean;
  editing: Product | null;
  form: UseFormReturn<Form>;
  categories: Category[];
  allergens: Allergen[];
  units: ProductUnit[];
  permissions: string[];
  onClose: () => void;
  onSubmit: (values: Form) => Promise<void>;
  onChanged?: () => Promise<void>;
}>): JSX.Element | null {
  const [tab, setTab] = useState<TabId>('details');
  const allergenIds = form.watch('allergenIds') ?? [];
  const isPublished = form.watch('isPublished');
  const unitId = form.watch('unitId');
  const selectedUnit = units.find((unit) => unit.id === unitId);
  const needsQuantity = selectedUnit != null && selectedUnit.kind !== 'COUNT';

  const canMedia = Boolean(editing) && can(permissions, ['media.upload', 'media.delete']);
  const canOptions = Boolean(editing) && can(permissions, ['products.manageOptions']);

  const tabs = (
    [
      { id: 'details' as const, label: 'Bilgiler', icon: 'edit', show: true },
      { id: 'media' as const, label: 'Görseller', icon: 'photo_library', show: canMedia },
      { id: 'options' as const, label: 'Opsiyonlar', icon: 'tune', show: canOptions },
    ] satisfies Array<{ id: TabId; label: string; icon: string; show: boolean }>
  ).filter((t) => t.show);

  useEffect(() => {
    setTab('details');
  }, [editing?.id, open]);

  if (!open) return null;

  function toggleAllergen(id: string): void {
    const next = allergenIds.includes(id) ? allergenIds.filter((x) => x !== id) : [...allergenIds, id];
    form.setValue('allergenIds', next, { shouldDirty: true });
  }

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
        aria-labelledby="product-form-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <h2 id="product-form-title" className="font-display text-xl font-semibold text-on-surface">
              {editing ? 'Ürünü düzenle' : 'Yeni ürün'}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {editing ? 'Değişiklikler kaydedildiğinde katalog güncellenir.' : 'Temel bilgileri girin; medya ve opsiyonları kayıttan sonra ekleyebilirsiniz.'}
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
          {editing ? (
            <nav className="flex gap-1 overflow-x-auto border-b border-outline-variant/25 px-4" aria-label="Ürün düzenleme sekmeleri">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={
                      active
                        ? 'flex items-center gap-2 border-b-2 border-secondary px-4 py-3 text-sm font-semibold text-secondary'
                        : 'flex items-center gap-2 px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:text-on-surface'
                    }
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </nav>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {tab === 'details' ? (
              <div className="space-y-4">
                <Field label="Ürün adı" error={form.formState.errors.name?.message}>
                  <input className={adminInputClass} placeholder="Örn. Sourdough ekşi mayalı" {...form.register('name')} />
                </Field>
                <Field label="Kategori" error={form.formState.errors.categoryId?.message}>
                  <select className={adminSelectClass} {...form.register('categoryId')}>
                    <option value="">Kategori seçin</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Satış birimi" error={form.formState.errors.unitId?.message}>
                    <select className={adminSelectClass} {...form.register('unitId')}>
                      <option value="">Birim seçin</option>
                      {units.filter((unit) => unit.isActive).map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={needsQuantity ? 'Miktar (zorunlu)' : 'Miktar (opsiyonel)'}
                    error={form.formState.errors.unitQuantity?.message as string | undefined}
                  >
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className={adminInputClass}
                      placeholder={needsQuantity ? 'Örn. 500' : 'Boş bırakılabilir'}
                      {...form.register('unitQuantity')}
                    />
                  </Field>
                </div>
                {needsQuantity ? (
                  <p className="rounded-lg border border-secondary/20 bg-secondary-container/30 px-3 py-2 text-xs text-on-surface-variant">
                    Vitrin örneği: {String(form.watch('unitQuantity') || '500')} {selectedUnit?.symbol} {String(form.watch('name') || 'ürün adı')}
                  </p>
                ) : null}
                <Field label="Katalog durumu" error={form.formState.errors.status?.message}>
                  <select className={adminSelectClass} {...form.register('status')}>
                    {(Object.keys(PRODUCT_STATUS_LABELS) as Array<keyof typeof PRODUCT_STATUS_LABELS>).map((key) => (
                      <option key={key} value={key}>
                        {PRODUCT_STATUS_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-start gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-secondary" {...form.register('isPublished')} />
                  <span>
                    <span className="block text-sm font-medium text-on-surface">Web&apos;de yayında</span>
                    <span className="mt-0.5 block text-xs text-on-surface-variant">
                      Kapalıysa ürün vitrinde görünür ancak &quot;Tükendi&quot; olarak listelenir ve satışa kapalı olur.
                    </span>
                  </span>
                </label>
                {!isPublished ? (
                  <p className="rounded-lg border border-error/25 bg-error-container/40 px-3 py-2 text-xs text-error">
                    Bu ürün web sitesinde tükendi görünümünde olacak.
                  </p>
                ) : null}
                <div className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Satış saati (opsiyonel)</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Boş bırakılırsa gün boyu satışa açık. Doluysa her gün bu saatler arasında açılır (Europe/Istanbul).
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Başlangıç" error={form.formState.errors.saleWindowStart?.message}>
                      <input type="time" className={adminInputClass} {...form.register('saleWindowStart')} />
                    </Field>
                    <Field label="Bitiş" error={form.formState.errors.saleWindowEnd?.message}>
                      <input type="time" className={adminInputClass} {...form.register('saleWindowEnd')} />
                    </Field>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fiyat (₺)" error={form.formState.errors.price?.message as string | undefined}>
                    <input type="number" step="0.01" min="0" className={adminInputClass} {...form.register('price')} />
                  </Field>
                  <Field label="İndirimli fiyat" error={form.formState.errors.discountedPrice?.message as string | undefined}>
                    <input type="number" step="0.01" min="0" className={adminInputClass} placeholder="Opsiyonel" {...form.register('discountedPrice')} />
                  </Field>
                </div>
                <Field label="Hazırlık süresi (dk)" error={form.formState.errors.preparationMinutes?.message as string | undefined}>
                  <input type="number" min="1" className={adminInputClass} placeholder="Opsiyonel" {...form.register('preparationMinutes')} />
                </Field>
                <Field label="Kısa açıklama" error={form.formState.errors.shortDescription?.message}>
                  <textarea className={adminTextareaClass} rows={2} placeholder="Vitrinde görünen özet" {...form.register('shortDescription')} />
                </Field>
                <Field label="Detaylı açıklama" error={form.formState.errors.description?.message}>
                  <textarea className={adminTextareaClass} rows={3} placeholder="Ürün sayfası metni" {...form.register('description')} />
                </Field>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-on-surface">Alerjenler</legend>
                  {allergens.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">Tanımlı alerjen yok.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allergens.map((allergen) => {
                        const checked = allergenIds.includes(allergen.id);
                        return (
                          <button
                            key={allergen.id}
                            type="button"
                            onClick={() => toggleAllergen(allergen.id)}
                            className={
                              checked
                                ? 'rounded-full border border-secondary/30 bg-secondary-container px-3 py-1.5 text-xs font-semibold text-secondary'
                                : 'rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-secondary/25'
                            }
                          >
                            {allergen.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {form.formState.errors.allergenIds?.message ? (
                    <span className="block text-xs text-error">{String(form.formState.errors.allergenIds.message)}</span>
                  ) : null}
                </fieldset>
              </div>
            ) : tab === 'media' && editing && canMedia ? (
              <ProductMediaPanel product={editing} onChanged={onChanged ?? (async () => undefined)} embedded />
            ) : tab === 'options' && editing && canOptions ? (
              <ProductOptionsPanel product={editing} onChanged={onChanged ?? (async () => undefined)} embedded />
            ) : (
              <p className="text-sm text-on-surface-variant">Bu sekme için erişiminiz yok.</p>
            )}
          </div>

          <footer className="flex gap-3 border-t border-outline-variant/40 px-6 py-4">
            <button type="button" className={`${adminSecondaryButtonClass} flex-1`} onClick={onClose}>
              Vazgeç
            </button>
            {tab === 'details' ? (
              <button type="submit" className={`${adminPrimaryButtonClass} flex-1`} disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            ) : (
              <button type="button" className={`${adminPrimaryButtonClass} flex-1`} onClick={() => setTab('details')}>
                Bilgileri düzenle
              </button>
            )}
          </footer>
        </form>
      </aside>
    </>
  );
}
