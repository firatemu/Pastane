'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { createCampaignSchema, updateCampaignSchema } from '../../lib/operations/schemas';
import type { CampaignRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { Field } from '../shared/form-field';
import { ErrorState, LoadingState } from '../shared/async-state';

type CreateForm = z.infer<typeof createCampaignSchema>;
type UpdateForm = z.infer<typeof updateCampaignSchema>;

export function CampaignsManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CampaignRow | null>(null);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createCampaignSchema) as Resolver<CreateForm>,
    defaultValues: {
      name: '',
      description: '',
      type: 'PERCENT',
      value: 0,
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
    },
  });

  const editForm = useForm<UpdateForm>({
    resolver: zodResolver(updateCampaignSchema) as Resolver<UpdateForm>,
    defaultValues: {},
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows(await adminFetch<CampaignRow[]>('/campaigns'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanyalar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    editForm.reset({
      name: editing.name,
      description: editing.description ?? '',
      type: editing.type,
      value: Number(editing.value),
      status: editing.status as 'ACTIVE' | 'INACTIVE',
      startDate: editing.startDate.slice(0, 10),
      endDate: editing.endDate ? editing.endDate.slice(0, 10) : '',
    });
  }, [editing]);

  async function submitCreate(v: CreateForm): Promise<void> {
    try {
      setError(null);
      await adminFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          ...v,
          endDate: v.endDate || undefined,
          description: v.description || undefined,
        }),
      });
      createForm.reset({
        name: '',
        description: '',
        type: 'PERCENT',
        value: 0,
        status: 'ACTIVE',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
      });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanya oluşturulamadı.'));
    }
  }

  async function submitEdit(v: UpdateForm): Promise<void> {
    if (!editing) return;
    try {
      setError(null);
      const body = {
        ...v,
        endDate: v.endDate === '' ? null : v.endDate,
        description: v.description === '' ? null : v.description,
      };
      await adminFetch(`/campaigns/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanya güncellenemedi.'));
    }
  }

  async function removeRow(row: CampaignRow): Promise<void> {
    if (!window.confirm(`"${row.name}" kampanyasını pasifleştirmek istiyor musunuz?`)) return;
    try {
      setError(null);
      await adminFetch(`/campaigns/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanya pasifleştirilemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<CampaignRow>[]>(
    () => [
      { header: 'Ad', accessorKey: 'name' },
      { header: 'Tür', accessorKey: 'type' },
      {
        header: 'Değer',
        cell: ({ row }) => row.original.value,
      },
      {
        header: 'Durum',
        cell: ({ row }) =>
          row.original.status === 'ACTIVE'
            ? 'Aktif'
            : row.original.status === 'INACTIVE'
              ? 'Pasif'
              : row.original.status,
      },
      {
        header: 'Başlangıç',
        cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString('tr-TR'),
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {can(permissions, ['campaigns.update']) ? (
              <button type="button" className="text-amber-800" onClick={() => setEditing(row.original)}>
                Düzenle
              </button>
            ) : null}
            {can(permissions, ['campaigns.delete']) ? (
              <button type="button" className="text-red-700" onClick={() => void removeRow(row.original)}>
                Pasifleştir
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [permissions],
  );

  if (loading) return <LoadingState label="Kampanyalar yükleniyor…" />;

  return (
    <PageSection title="Kampanyalar" description="Liste, oluşturma ve güncelleme backend kampanya kayıtlarıyla eşleşir.">
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DataTable data={rows.filter((r) => !r.deletedAt)} columns={columns} />
        <div className="space-y-6">
          {can(permissions, ['campaigns.create']) ? (
            <form className="space-y-3 rounded-3xl border bg-white p-5" onSubmit={createForm.handleSubmit(submitCreate)}>
              <h2 className="font-semibold">Yeni kampanya</h2>
              <Field label="Ad" error={createForm.formState.errors.name?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...createForm.register('name')} />
              </Field>
              <Field label="Açıklama" error={createForm.formState.errors.description?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...createForm.register('description')} />
              </Field>
              <Field label="Tür (ör. PERCENT, FIXED)" error={createForm.formState.errors.type?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...createForm.register('type')} />
              </Field>
              <Field label="Değer" error={createForm.formState.errors.value?.message}>
                <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...createForm.register('value', { valueAsNumber: true })} />
              </Field>
              <Field label="Durum" error={createForm.formState.errors.status?.message}>
                <select className="w-full rounded-2xl border px-3 py-2" {...createForm.register('status')}>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </Field>
              <Field label="Başlangıç" error={createForm.formState.errors.startDate?.message}>
                <input type="date" className="w-full rounded-2xl border px-3 py-2" {...createForm.register('startDate')} />
              </Field>
              <Field label="Bitiş (isteğe bağlı)" error={createForm.formState.errors.endDate?.message}>
                <input type="date" className="w-full rounded-2xl border px-3 py-2" {...createForm.register('endDate')} />
              </Field>
              <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
                Oluştur
              </button>
            </form>
          ) : null}
          {editing && can(permissions, ['campaigns.update']) ? (
            <form className="space-y-3 rounded-3xl border bg-white p-5" onSubmit={editForm.handleSubmit(submitEdit)}>
              <h2 className="font-semibold">Düzenle</h2>
              <p className="text-sm text-stone-600">{editing.name}</p>
              <Field label="Ad" error={editForm.formState.errors.name?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('name')} />
              </Field>
              <Field label="Açıklama" error={editForm.formState.errors.description?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('description')} />
              </Field>
              <Field label="Tür" error={editForm.formState.errors.type?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('type')} />
              </Field>
              <Field label="Değer" error={editForm.formState.errors.value?.message}>
                <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...editForm.register('value', { valueAsNumber: true })} />
              </Field>
              <Field label="Durum" error={editForm.formState.errors.status?.message}>
                <select className="w-full rounded-2xl border px-3 py-2" {...editForm.register('status')}>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </Field>
              <Field label="Başlangıç" error={editForm.formState.errors.startDate?.message}>
                <input type="date" className="w-full rounded-2xl border px-3 py-2" {...editForm.register('startDate')} />
              </Field>
              <Field label="Bitiş" error={editForm.formState.errors.endDate?.message}>
                <input type="date" className="w-full rounded-2xl border px-3 py-2" {...editForm.register('endDate')} />
              </Field>
              <div className="flex gap-2">
                <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
                  Kaydet
                </button>
                <button
                  type="button"
                  className="rounded-2xl border px-4 py-2"
                  onClick={() => {
                    setEditing(null);
                  }}
                >
                  İptal
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </PageSection>
  );
}
