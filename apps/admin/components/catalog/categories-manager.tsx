'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { categorySchema } from '../../lib/catalog/schemas';
import type { Category } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

type Form = z.input<typeof categorySchema>;

function flatten(rows: Category[]): Category[] {
  return rows.flatMap((row) => [row, ...flatten(row.children ?? [])]);
}

export function CategoriesManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', imageUrl: '', parentId: '', sortOrder: 0, isActive: true },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows(flatten(await adminFetch<Category[]>('/categories')));
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kategoriler yüklenemedi.'));
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
      const body = { ...values, parentId: values.parentId || undefined, imageUrl: values.imageUrl || undefined };
      await adminFetch(`/categories${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      form.reset({ name: '', description: '', imageUrl: '', parentId: '', sortOrder: 0, isActive: true });
      setEditing(null);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kategori kaydedilemedi.'));
    }
  }

  function start(category: Category): void {
    setEditing(category);
    form.reset({
      name: category.name,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      parentId: category.parentId ?? '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  }

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      { header: 'Kategori', accessorKey: 'name' },
      { header: 'Slug', accessorKey: 'slug' },
      { header: 'Sıra', accessorKey: 'sortOrder' },
      { header: 'Durum', cell: ({ row }) => (row.original.isActive ? 'Aktif' : 'Pasif') },
      {
        header: 'Aksiyon',
        cell: ({ row }) =>
          can(permissions, ['categories.update']) ? (
            <button className="text-amber-700" onClick={() => start(row.original)}>
              Düzenle
            </button>
          ) : null,
      },
    ],
    [permissions],
  );

  return (
    <PageSection title="Kategoriler" description="Global benzersiz slug kuralları backend tarafından korunur.">
      {loading ? (
        <LoadingState label="Kategoriler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <DataTable data={rows} columns={columns} />
          {can(permissions, ['categories.create', 'categories.update']) ? (
            <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(submit)}>
              <h2 className="font-semibold">{editing ? 'Kategori düzenle' : 'Yeni kategori'}</h2>
              <Field label="Ad" error={form.formState.errors.name?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('name')} />
              </Field>
              <Field label="Açıklama" error={form.formState.errors.description?.message}>
                <textarea className="w-full rounded-2xl border px-3 py-2" {...form.register('description')} />
              </Field>
              <Field label="Görsel URL" error={form.formState.errors.imageUrl?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('imageUrl')} />
              </Field>
              <Field label="Üst kategori" error={form.formState.errors.parentId?.message}>
                <select className="w-full rounded-2xl border px-3 py-2" {...form.register('parentId')}>
                  <option value="">Yok</option>
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sıra" error={form.formState.errors.sortOrder?.message as string | undefined}>
                <input type="number" className="w-full rounded-2xl border px-3 py-2" {...form.register('sortOrder')} />
              </Field>
              <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white">Kaydet</button>
            </form>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
