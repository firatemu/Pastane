'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { movementSchema, stockSchema, updateStockEntrySchema } from '../../lib/catalog/schemas';
import type { Product, StockEntry } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

type Form = z.input<typeof stockSchema>;
type Move = z.input<typeof movementSchema>;
type EditFormIn = z.input<typeof updateStockEntrySchema>;
type EditFormOut = z.infer<typeof updateStockEntrySchema>;

function formatWindowCell(row: StockEntry): string {
  if (row.availableFrom && row.availableTo) return `${row.availableFrom} – ${row.availableTo}`;
  if (row.availableFrom || row.availableTo) return `${row.availableFrom ?? '—'} – ${row.availableTo ?? '—'}`;
  return 'Tüm gün';
}

export function StockManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movementEntry, setMovementEntry] = useState<StockEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(stockSchema),
    defaultValues: { productId: '', date: new Date().toISOString().slice(0, 10), quantity: 0, availableFrom: '', availableTo: '' },
  });
  const editForm = useForm<EditFormIn, unknown, EditFormOut>({
    resolver: zodResolver(updateStockEntrySchema),
    defaultValues: { quantity: 0, availableFrom: '', availableTo: '' },
  });
  const move = useForm<Move>({ resolver: zodResolver(movementSchema), defaultValues: { type: 'ADJUSTMENT', quantity: 1, note: '' } });

  async function load(): Promise<void> {
    try {
      setError(null);
      const [stock, productRows] = await Promise.all([adminFetch<StockEntry[]>('/stock'), adminFetchEnvelope<Product[]>('/products?limit=100')]);
      setRows(stock);
      setProducts(productRows.data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Stok verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!editingEntry) return;
    editForm.reset({
      quantity: editingEntry.quantity,
      availableFrom: editingEntry.availableFrom ?? '',
      availableTo: editingEntry.availableTo ?? '',
    });
  }, [editingEntry]);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      await adminFetch('/stock', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          availableFrom: values.availableFrom || undefined,
          availableTo: values.availableTo || undefined,
        }),
      });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Stok girişi kaydedilemedi.'));
    }
  }

  async function submitEdit(values: EditFormOut): Promise<void> {
    if (!editingEntry) return;
    try {
      setError(null);
      const body: { quantity: number; availableFrom?: string; availableTo?: string } = { quantity: values.quantity };
      if (values.availableFrom && values.availableTo) {
        body.availableFrom = values.availableFrom;
        body.availableTo = values.availableTo;
      }
      await adminFetch(`/stock/${editingEntry.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditingEntry(null);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Stok satırı güncellenemedi.'));
    }
  }

  async function movement(values: Move): Promise<void> {
    if (!movementEntry) return;
    try {
      setError(null);
      await adminFetch(`/stock/${movementEntry.id}/movements`, { method: 'POST', body: JSON.stringify(values) });
      move.reset({ type: 'ADJUSTMENT', quantity: 1, note: '' });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Stok hareketi kaydedilemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<StockEntry>[]>(
    () => [
      { header: 'Ürün', cell: ({ row }) => row.original.product.name },
      { header: 'Tarih', cell: ({ row }) => row.original.date.slice(0, 10) },
      { header: 'Pencere', cell: ({ row }) => formatWindowCell(row.original) },
      { header: 'Adet', accessorKey: 'quantity' },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {can(permissions, ['stock.update']) ? (
              <button
                type="button"
                className="text-amber-700"
                onClick={() => {
                  setMovementEntry(null);
                  setEditingEntry(row.original);
                }}
              >
                Düzenle
              </button>
            ) : null}
            {can(permissions, ['stock.adjust']) ? (
              <button
                type="button"
                className="text-amber-700"
                onClick={() => {
                  setEditingEntry(null);
                  setMovementEntry(row.original);
                }}
              >
                Hareket
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [permissions],
  );

  return (
    <PageSection
      title="Stok Yönetimi"
      description="Tarih, takvim günü olarak Europe/Istanbul’a göre saklanır; saat pencereleri de aynı zaman diliminde değerlendirilir. Yeni kayıtta saat alanlarını boş bırakmak = o gün için sürekli satış."
    >
      {loading ? (
        <LoadingState label="Stok verileri yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <DataTable data={rows} columns={columns} />
            {can(permissions, ['stock.create']) ? (
              <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(submit)}>
                <h2 className="font-semibold">Yeni stok girişi</h2>
                <Field label="Ürün" error={form.formState.errors.productId?.message}>
                  <select className="w-full rounded-2xl border px-3 py-2" {...form.register('productId')}>
                    <option value="">Seçin</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tarih" error={form.formState.errors.date?.message}>
                  <input type="date" className="w-full rounded-2xl border px-3 py-2" {...form.register('date')} />
                </Field>
                <Field label="Adet" error={form.formState.errors.quantity?.message as string | undefined}>
                  <input type="number" className="w-full rounded-2xl border px-3 py-2" {...form.register('quantity')} />
                </Field>
                <p className="text-xs text-stone-500">
                  <strong>Satış penceresi (isteğe bağlı):</strong> Her iki saati de doldurun veya ikisini de boş bırakın. Boş = o gün 00:00–24:00 (İstanbul) boyunca
                  sipariş alınabilir. Dar pencereler dışında vitrin &quot;Stok penceresi aktif değil&quot; hatası verir.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Başlangıç (İstanbul)" error={form.formState.errors.availableFrom?.message}>
                    <input type="time" className="w-full rounded-2xl border px-3 py-2" {...form.register('availableFrom')} />
                  </Field>
                  <Field label="Bitiş (İstanbul)" error={form.formState.errors.availableTo?.message}>
                    <input type="time" className="w-full rounded-2xl border px-3 py-2" {...form.register('availableTo')} />
                  </Field>
                </div>
                <button type="submit" className="rounded-2xl bg-stone-900 px-4 py-2 text-white">
                  Kaydet
                </button>
              </form>
            ) : null}
          </div>

          {editingEntry && can(permissions, ['stock.update']) ? (
            <form className="space-y-4 rounded-3xl border border-amber-100 bg-amber-50/40 p-5" onSubmit={editForm.handleSubmit(submitEdit)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold">
                  Stok satırını düzenle: {editingEntry.product.name} — {editingEntry.date.slice(0, 10)}
                </div>
                <button type="button" className="text-sm text-stone-600 underline" onClick={() => setEditingEntry(null)}>
                  Vazgeç
                </button>
              </div>
              <p className="text-sm text-stone-600">
                Miktarı güncelleyebilirsiniz. Saatleri yalnızca <strong>ikisini birden</strong> değiştirirseniz yeni pencere uygulanır; alanları boş bırakırsanız mevcut
                pencere aynen kalır. Tam gün satışa geçmek için genelde yeni bir stok satırı oluşturmanız gerekir.
              </p>
              <Field label="Adet" error={editForm.formState.errors.quantity?.message as string | undefined}>
                <input type="number" className="w-full rounded-2xl border bg-white px-3 py-2" {...editForm.register('quantity')} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Başlangıç (İstanbul)" error={editForm.formState.errors.availableFrom?.message}>
                  <input type="time" className="w-full rounded-2xl border bg-white px-3 py-2" {...editForm.register('availableFrom')} />
                </Field>
                <Field label="Bitiş (İstanbul)" error={editForm.formState.errors.availableTo?.message}>
                  <input type="time" className="w-full rounded-2xl border bg-white px-3 py-2" {...editForm.register('availableTo')} />
                </Field>
              </div>
              <button type="submit" className="rounded-2xl bg-stone-900 px-4 py-2 text-white">
                Güncelle
              </button>
            </form>
          ) : null}

          {movementEntry && can(permissions, ['stock.adjust']) ? (
            <form className="grid gap-4 rounded-3xl border bg-white p-5 sm:grid-cols-4" onSubmit={move.handleSubmit(movement)}>
              <div className="font-semibold sm:col-span-4">{movementEntry.product.name} için stok hareketi</div>
              <Field label="Tür" error={move.formState.errors.type?.message}>
                <select className="w-full rounded-2xl border px-3 py-2" {...move.register('type')}>
                  <option value="IN">Giriş</option>
                  <option value="OUT">Çıkış</option>
                  <option value="ADJUSTMENT">Düzeltme</option>
                </select>
              </Field>
              <Field label="Adet" error={move.formState.errors.quantity?.message as string | undefined}>
                <input type="number" className="w-full rounded-2xl border px-3 py-2" {...move.register('quantity')} />
              </Field>
              <Field label="Not" error={move.formState.errors.note?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...move.register('note')} />
              </Field>
              <button type="submit" className="self-end rounded-2xl bg-stone-900 px-4 py-2 text-white">
                Uygula
              </button>
            </form>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
