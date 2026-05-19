'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { allergenSchema } from '../../lib/catalog/schemas';
import type { Allergen } from '../../lib/catalog/types';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { Field } from '../shared/form-field';
import { ErrorState, LoadingState } from '../shared/async-state';

type Form = z.input<typeof allergenSchema>;

export function AllergensManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Allergen[]>([]);
  const [editing, setEditing] = useState<Allergen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({ resolver: zodResolver(allergenSchema), defaultValues: { name: '' } });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows((await adminFetchEnvelope<Allergen[]>('/allergens?limit=100')).data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Alerjenler yüklenemedi.'));
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
      await adminFetch(`/allergens${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      });
      form.reset({ name: '' });
      setEditing(null);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Alerjen kaydedilemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<Allergen>[]>(
    () => [
      { header: 'Alerjen', accessorKey: 'name' },
      {
        header: 'Aksiyon',
        cell: ({ row }) =>
          can(permissions, ['permissions.manage']) ? (
            <button
              className="text-amber-700"
              onClick={() => {
                setEditing(row.original);
                form.reset({ name: row.original.name });
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
    <PageSection title="Alerjenler">
      {loading ? (
        <LoadingState label="Alerjenler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <DataTable data={rows} columns={columns} />
          {can(permissions, ['permissions.manage']) ? (
            <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(submit)}>
              <h2 className="font-semibold">{editing ? 'Alerjen düzenle' : 'Yeni alerjen'}</h2>
              <Field label="Ad" error={form.formState.errors.name?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('name')} />
              </Field>
              <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white">Kaydet</button>
            </form>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
