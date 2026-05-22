'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { productSchema } from '../../lib/catalog/schemas';
import type { Allergen, Category, Product } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { adminInputClass, adminPrimaryButtonClass, adminSelectClass } from '../shared/admin-form-controls';
import { PRODUCT_STATUS_LABELS } from './product-status-pill';
import { ProductDetailModal } from './product-detail-modal';
import { ProductFormSheet } from './product-form-sheet';
import { ProductsList } from './products-list';
import { ProductsStatsBar } from './products-stats-bar';

type Form = z.input<typeof productSchema>;

function flatten(rows: Category[]): Category[] {
  return rows.flatMap((row) => [row, ...flatten(row.children ?? [])]);
}

const emptyForm: Form = {
  name: '',
  description: '',
  shortDescription: '',
  price: 0,
  discountedPrice: '',
  categoryId: '',
  status: 'ACTIVE',
  isPublished: true,
  saleWindowStart: '',
  saleWindowEnd: '',
  preparationMinutes: '',
  allergenIds: [],
};

export function ProductsManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchParams = useSearchParams();

  const form = useForm<Form>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyForm,
  });

  const canCreate = can(permissions, ['products.create']);
  const canUpdate = can(permissions, ['products.update']);
  const canEdit = canCreate || canUpdate;

  async function load(): Promise<void> {
    try {
      setError(null);
      const [products, categoryRows, allergenRows] = await Promise.all([
        adminFetchEnvelope<Product[]>('/products/admin?limit=100'),
        adminFetch<Category[]>('/categories'),
        adminFetchEnvelope<Allergen[]>('/allergens?limit=100'),
      ]);
      setRows(products.data);
      setCategories(flatten(categoryRows));
      setAllergens(allergenRows.data);
      setSelected((prev) => (prev ? products.data.find((p) => p.id === prev.id) ?? null : null));
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Ürün verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const categoryId = searchParams.get('categoryId');
    if (categoryId) setCategoryFilter(categoryId);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q) ||
        (p.shortDescription?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, categoryFilter, statusFilter]);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      const body = {
        ...values,
        discountedPrice: values.discountedPrice === '' ? undefined : values.discountedPrice,
        preparationMinutes: values.preparationMinutes === '' ? undefined : values.preparationMinutes,
        saleWindowStart: values.saleWindowStart?.trim() ? values.saleWindowStart : undefined,
        saleWindowEnd: values.saleWindowEnd?.trim() ? values.saleWindowEnd : undefined,
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
      setFormOpen(false);
      form.reset(emptyForm);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Ürün kaydedilemedi.'));
    }
  }

  function openCreate(): void {
    setEditing(null);
    form.reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(product: Product): void {
    setEditing(product);
    setSelected(product);
    form.reset({
      name: product.name,
      description: product.description ?? '',
      shortDescription: product.shortDescription ?? '',
      price: Number(product.price),
      discountedPrice: product.discountedPrice ? Number(product.discountedPrice) : '',
      categoryId: product.categoryId,
      status: product.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      isPublished: product.isPublished,
      saleWindowStart: product.saleWindowStart ?? '',
      saleWindowEnd: product.saleWindowEnd ?? '',
      preparationMinutes: product.preparationMinutes ?? '',
      allergenIds: product.allergens.map((a) => a.allergen.id),
    });
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    form.reset(emptyForm);
  }

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">Ürünler</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Katalog ürünlerinizi arayın, filtreleyin ve detay panelinden medya, opsiyonlar ile yayın/saat ayarlarını yönetin.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Ürün verileri yükleniyor…" />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          <ProductsStatsBar products={rows} />

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Ara</span>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                    search
                  </span>
                  <input
                    className={`${adminInputClass} pl-10`}
                    placeholder="Ad, slug veya kategori…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Kategori</span>
                <select className={adminSelectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">Tümü</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Durum</span>
                <select className={adminSelectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Tümü</option>
                  {(Object.keys(PRODUCT_STATUS_LABELS) as Array<keyof typeof PRODUCT_STATUS_LABELS>).map((key) => (
                    <option key={key} value={key}>
                      {PRODUCT_STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {canCreate ? (
              <button type="button" className={`${adminPrimaryButtonClass} shrink-0`} onClick={openCreate}>
                <span className="material-symbols-outlined text-[20px]">add</span>
                Yeni ürün
              </button>
            ) : null}
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} ürün listeleniyor`
              : `${filtered.length} / ${rows.length} ürün (filtreli)`}
          </p>

          <ProductsList
            products={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            canEdit={canUpdate}
          />

        </div>
      )}

      <ProductDetailModal
        product={selected}
        permissions={permissions}
        onEdit={() => {
          if (!selected) return;
          const product = selected;
          setSelected(null);
          openEdit(product);
        }}
        onClose={() => setSelected(null)}
        onChanged={load}
      />

      {canEdit ? (
        <ProductFormSheet
          open={formOpen}
          editing={editing}
          form={form}
          categories={categories}
          allergens={allergens}
          permissions={permissions}
          onClose={closeForm}
          onSubmit={submit}
          onChanged={load}
        />
      ) : null}
    </section>
  );
}

