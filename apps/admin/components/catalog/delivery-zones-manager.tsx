'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { zoneSchema } from '../../lib/catalog/schemas';
import type { DeliveryZone } from '../../lib/catalog/types';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

type Form = z.input<typeof zoneSchema>;

export function DeliveryZonesManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<DeliveryZone[]>([]);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { name: '', minimumOrderPrice: '', deliveryFee: 0, estimatedMinutes: '', isActive: true },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows((await adminFetchEnvelope<DeliveryZone[]>('/delivery-zones?limit=100')).data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Teslimat bölgeleri yüklenemedi.'));
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
      await adminFetch(`/delivery-zones${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...values,
          minimumOrderPrice: values.minimumOrderPrice === '' ? undefined : values.minimumOrderPrice,
          estimatedMinutes: values.estimatedMinutes === '' ? undefined : values.estimatedMinutes,
        }),
      });
      setEditing(null);
      form.reset();
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Teslimat bölgesi kaydedilemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<DeliveryZone>[]>(
    () => [
      { header: 'Bölge', accessorKey: 'name' },
      { header: 'Min. Sepet', accessorKey: 'minimumOrderPrice' },
      { header: 'Teslimat Ücreti', accessorKey: 'deliveryFee' },
      { header: 'Süre', accessorKey: 'estimatedMinutes' },
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
                  minimumOrderPrice: row.original.minimumOrderPrice ?? '',
                  estimatedMinutes: row.original.estimatedMinutes ?? '',
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
    <PageSection title="Teslimat Bölgeleri">
      {loading ? (
        <LoadingState label="Teslimat bölgeleri yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <DataTable data={rows} columns={columns} />
          {can(permissions, ['settings.update']) ? (
            <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(submit)}>
              <h2 className="font-semibold">{editing ? 'Bölge düzenle' : 'Yeni bölge'}</h2>
              <Field label="Ad" error={form.formState.errors.name?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('name')} />
              </Field>
              <Field label="Minimum sepet" error={form.formState.errors.minimumOrderPrice?.message as string | undefined}>
                <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...form.register('minimumOrderPrice')} />
              </Field>
              <Field label="Teslimat ücreti" error={form.formState.errors.deliveryFee?.message as string | undefined}>
                <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...form.register('deliveryFee')} />
              </Field>
              <Field label="Tahmini dakika" error={form.formState.errors.estimatedMinutes?.message as string | undefined}>
                <input type="number" className="w-full rounded-2xl border px-3 py-2" {...form.register('estimatedMinutes')} />
              </Field>
              <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white">Kaydet</button>
            </form>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
