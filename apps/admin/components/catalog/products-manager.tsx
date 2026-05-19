'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { productSchema } from '../../lib/catalog/schemas';
import type { Allergen, Category, Product } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';
import { ProductMediaPanel } from './product-media-panel';
import { ProductOptionsPanel } from './product-options-panel';
import { ProductStockPanel } from './product-stock-panel';
import { formatTry } from '../../lib/format/format-try';

type Form = z.input<typeof productSchema>;

function flatten(rows: Category[]): Category[] {
  return rows.flatMap((row) => [row, ...flatten(row.children ?? [])]);
}

export function ProductsManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      shortDescription: '',
      price: 0,
      discountedPrice: '',
      categoryId: '',
      status: 'ACTIVE',
      preparationMinutes: '',
      allergenIds: [],
    },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      const [products, categoryRows, allergenRows] = await Promise.all([
        adminFetchEnvelope<Product[]>('/products?limit=100'),
        adminFetch<Category[]>('/categories'),
        adminFetchEnvelope<Allergen[]>('/allergens?limit=100'),
      ]);
      setRows(products.data);
      setCategories(flatten(categoryRows));
      setAllergens(allergenRows.data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Ürün verileri yüklenemedi.'));
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
      const body = {
        ...values,
        discountedPrice: values.discountedPrice === '' ? undefined : values.discountedPrice,
        preparationMinutes: values.preparationMinutes === '' ? undefined : values.preparationMinutes,
      };
      const saved = await adminFetch<Product>(`/products${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      if (editing) {
        await adminFetch(`/products/${editing.id}/allergens`, {
          method: 'PATCH',
          body: JSON.stringify({ allergenIds: values.allergenIds }),
        });
      }
      setSelected(saved);
      setEditing(null);
      form.reset({
        name: '',
        description: '',
        shortDescription: '',
        price: 0,
        discountedPrice: '',
        categoryId: '',
        status: 'ACTIVE',
        preparationMinutes: '',
        allergenIds: [],
      });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Ürün kaydedilemedi.'));
    }
  }

  function start(product: Product): void {
    setEditing(product);
    setSelected(product);
    form.reset({
      name: product.name,
      description: product.description ?? '',
      shortDescription: product.shortDescription ?? '',
      price: Number(product.price),
      discountedPrice: product.discountedPrice ? Number(product.discountedPrice) : '',
      categoryId: product.categoryId,
      status: product.status,
      preparationMinutes: product.preparationMinutes ?? '',
      allergenIds: product.allergens.map((allergen) => allergen.allergen.id),
    });
  }

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { header: 'Ürün', accessorKey: 'name' },
      { header: 'Kategori', cell: ({ row }) => row.original.category.name },
      { header: 'Fiyat', cell: ({ row }) => formatTry(row.original.price) },
      {
        header: 'Durum',
        cell: ({ row }) => {
          const s = row.original.status;
          if (s === 'ACTIVE') return 'Aktif';
          if (s === 'INACTIVE') return 'Pasif';
          if (s === 'OUT_OF_STOCK') return 'Stokta yok';
          return s;
        },
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <div className="flex gap-3">
            <button className="text-amber-700" onClick={() => setSelected(row.original)}>
              Aç
            </button>
            {can(permissions, ['products.update']) ? (
              <button className="text-amber-700" onClick={() => start(row.original)}>
                Düzenle
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [permissions],
  );

  return (
    <PageSection title="Ürünler" description="Ürün kartından medya, seçenekler ve (stok izniniz varsa) tarih / İstanbul saatine göre satış pencerelerini görüntüleyebilirsiniz.">
      {loading ? (
        <LoadingState label="Ürün verileri yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <DataTable data={rows} columns={columns} />
            {can(permissions, ['products.create', 'products.update']) ? (
              <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(submit)}>
                <h2 className="font-semibold">{editing ? 'Ürün düzenle' : 'Yeni ürün'}</h2>
                <Field label="Ad" error={form.formState.errors.name?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...form.register('name')} />
                </Field>
                <Field label="Kategori" error={form.formState.errors.categoryId?.message}>
                  <select className="w-full rounded-2xl border px-3 py-2" {...form.register('categoryId')}>
                    <option value="">Seçin</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fiyat" error={form.formState.errors.price?.message as string | undefined}>
                    <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...form.register('price')} />
                  </Field>
                  <Field label="İndirimli fiyat" error={form.formState.errors.discountedPrice?.message as string | undefined}>
                    <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...form.register('discountedPrice')} />
                  </Field>
                </div>
                <Field label="Hazırlık dk" error={form.formState.errors.preparationMinutes?.message as string | undefined}>
                  <input type="number" className="w-full rounded-2xl border px-3 py-2" {...form.register('preparationMinutes')} />
                </Field>
                <Field label="Kısa açıklama" error={form.formState.errors.shortDescription?.message}>
                  <textarea className="w-full rounded-2xl border px-3 py-2" {...form.register('shortDescription')} />
                </Field>
                <Field label="Alerjenler" error={form.formState.errors.allergenIds?.message as string | undefined}>
                  <select multiple className="h-28 w-full rounded-2xl border px-3 py-2" {...form.register('allergenIds')}>
                    {allergens.map((allergen) => (
                      <option key={allergen.id} value={allergen.id}>
                        {allergen.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white">Kaydet</button>
              </form>
            ) : null}
          </div>
          {selected ? (
            <div className="space-y-6">
              {can(permissions, ['media.upload', 'media.delete']) || can(permissions, ['products.manageOptions']) ? (
                <div className="grid gap-6 xl:grid-cols-2">
                  {can(permissions, ['media.upload', 'media.delete']) ? <ProductMediaPanel product={selected} onChanged={load} /> : null}
                  {can(permissions, ['products.manageOptions']) ? <ProductOptionsPanel product={selected} onChanged={load} /> : null}
                </div>
              ) : null}
              <ProductStockPanel product={selected} permissions={permissions} />
            </div>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
