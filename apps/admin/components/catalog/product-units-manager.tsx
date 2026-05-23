'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { productUnitSchema } from '../../lib/catalog/schemas';
import type { ProductUnit } from '../../lib/catalog/types';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { Field } from '../shared/form-field';
import { adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass, adminSelectClass } from '../shared/admin-form-controls';

type Form = z.input<typeof productUnitSchema>;

const emptyForm: Form = { name: '', symbol: '', kind: 'COUNT', sortOrder: 0, isActive: true };

const KIND_LABELS: Record<ProductUnit['kind'], string> = {
  COUNT: 'Adet / sayı',
  WEIGHT: 'Ağırlık (gr, kg)',
  VOLUME: 'Hacim',
};

export function ProductUnitsManager({ permissions }: { permissions: string[] }): JSX.Element {
  const [rows, setRows] = useState<ProductUnit[]>([]);
  const [editing, setEditing] = useState<ProductUnit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm<Form>({ resolver: zodResolver(productUnitSchema), defaultValues: emptyForm });
  const canManage = can(permissions, ['productUnits.manage']);

  async function load(): Promise<void> {
    try {
      setError(null);
      const response = await adminFetchEnvelope<ProductUnit[]>('/product-units?limit=100');
      setRows(response.data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Birimler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/product-units${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      });
      setEditing(null);
      setFormOpen(false);
      form.reset(emptyForm);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Birim kaydedilemedi.'));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Bu birimi silmek istediğinize emin misiniz?')) return;
    try {
      setError(null);
      await adminFetch(`/product-units/${id}`, { method: 'DELETE' });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Birim silinemedi.'));
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.symbol.toLowerCase().includes(q));
  }, [rows, search]);

  function openCreate(): void {
    setEditing(null);
    form.reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(row: ProductUnit): void {
    setEditing(row);
    form.reset({
      name: row.name,
      symbol: row.symbol,
      kind: row.kind,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  return (
    <section className="space-y-stack-md">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">Ürün birimleri</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
            Adet, gram, kilogram gibi birimleri yönetin. Gramajlı ürünler vitrinde &quot;500 gr Sütlaç&quot; şeklinde görünür.
          </p>
        </div>
        {canManage ? (
          <button type="button" className={adminPrimaryButtonClass} onClick={openCreate}>
            Yeni birim
          </button>
        ) : null}
      </header>

      {loading ? <LoadingState label="Birimler yükleniyor…" /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          <input
            className={adminInputClass}
            placeholder="Birim ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ad</th>
                  <th className="px-4 py-3 font-semibold">Kısaltma</th>
                  <th className="px-4 py-3 font-semibold">Tip</th>
                  <th className="px-4 py-3 font-semibold">Ürün</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  {canManage ? <th className="px-4 py-3 font-semibold">İşlem</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-outline-variant/20 last:border-0">
                    <td className="px-4 py-3 font-medium text-on-surface">{row.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.symbol}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{KIND_LABELS[row.kind]}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.productCount ?? 0}</td>
                    <td className="px-4 py-3">{row.isActive ? 'Aktif' : 'Pasif'}</td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" className="text-secondary font-semibold" onClick={() => openEdit(row)}>
                            Düzenle
                          </button>
                          <button type="button" className="text-error font-semibold" onClick={() => void handleDelete(row.id)}>
                            Sil
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {formOpen ? (
        <>
          <button type="button" aria-label="Formu kapat" className="fixed inset-0 z-[60] bg-chocolate/25" onClick={() => setFormOpen(false)} />
          <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
            <h2 className="font-display text-xl font-semibold">{editing ? 'Birimi düzenle' : 'Yeni birim'}</h2>
            <form className="mt-6 flex flex-1 flex-col gap-4" onSubmit={form.handleSubmit(submit)}>
              <Field label="Görünen ad" error={form.formState.errors.name?.message}>
                <input className={adminInputClass} placeholder="Gram" {...form.register('name')} />
              </Field>
              <Field label="Kısaltma (vitrinde)" error={form.formState.errors.symbol?.message}>
                <input className={adminInputClass} placeholder="gr" {...form.register('symbol')} />
              </Field>
              <Field label="Tip" error={form.formState.errors.kind?.message}>
                <select className={adminSelectClass} {...form.register('kind')}>
                  {(Object.keys(KIND_LABELS) as ProductUnit['kind'][]).map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sıra" error={form.formState.errors.sortOrder?.message as string | undefined}>
                <input type="number" min={0} className={adminInputClass} {...form.register('sortOrder')} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-secondary" {...form.register('isActive')} />
                Aktif
              </label>
              <div className="mt-auto flex gap-3">
                <button type="button" className={`${adminSecondaryButtonClass} flex-1`} onClick={() => setFormOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className={`${adminPrimaryButtonClass} flex-1`} disabled={form.formState.isSubmitting}>
                  Kaydet
                </button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </section>
  );
}
