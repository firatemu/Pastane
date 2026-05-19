'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { storeSchema } from '../../lib/catalog/schemas';
import type { Store } from '../../lib/catalog/types';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

type Form = z.input<typeof storeSchema>;

export function StoresManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Store[]>([]);
  const [editing, setEditing] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(storeSchema),
    defaultValues: { name: '', phone: '', city: '', district: '', address: '', latitude: '', longitude: '', isActive: true },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows((await adminFetchEnvelope<Store[]>('/stores?limit=100')).data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Mağazalar yüklenemedi.'));
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
      await adminFetch(`/stores${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...values,
          latitude: values.latitude === '' ? undefined : values.latitude,
          longitude: values.longitude === '' ? undefined : values.longitude,
        }),
      });
      setEditing(null);
      form.reset();
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Mağaza kaydedilemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<Store>[]>(
    () => [
      { header: 'Mağaza', accessorKey: 'name' },
      { header: 'Konum', cell: ({ row }) => `${row.original.city} / ${row.original.district}` },
      { header: 'Telefon', accessorKey: 'phone' },
      {
        header: 'Aksiyon',
        cell: ({ row }) =>
          can(permissions, ['settings.update']) ? (
            <button
              className="text-amber-700"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  ...row.original,
                  phone: row.original.phone ?? '',
                  latitude: row.original.latitude ?? '',
                  longitude: row.original.longitude ?? '',
                });
              }}
            >
              Düzenle
            </button>
          ) : null,
      },
    ],
    [form, permissions],
  );

  return (
    <PageSection title="Mağazalar">
      {loading ? (
        <LoadingState label="Mağazalar yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <DataTable data={rows} columns={columns} />
          {can(permissions, ['settings.update']) ? (
            <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(submit)}>
              <h2 className="font-semibold">{editing ? 'Mağaza düzenle' : 'Yeni mağaza'}</h2>
              {(['name', 'phone', 'city', 'district', 'address'] as const).map((key) => (
                <Field key={key} label={key} error={form.formState.errors[key]?.message as string | undefined}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...form.register(key)} />
                </Field>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Enlem" error={form.formState.errors.latitude?.message as string | undefined}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...form.register('latitude')} />
                </Field>
                <Field label="Boylam" error={form.formState.errors.longitude?.message as string | undefined}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...form.register('longitude')} />
                </Field>
              </div>
              <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white">Kaydet</button>
            </form>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
