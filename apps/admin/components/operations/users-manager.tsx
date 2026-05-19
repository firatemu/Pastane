'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { adminUserUpdateSchema } from '../../lib/operations/schemas';
import type { AdminUserRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { Field } from '../shared/form-field';
import { ErrorState, LoadingState } from '../shared/async-state';

type UserForm = z.infer<typeof adminUserUpdateSchema>;

export function UsersManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const form = useForm<UserForm>({
    resolver: zodResolver(adminUserUpdateSchema),
    defaultValues: {},
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows(await adminFetch<AdminUserRow[]>('/users'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kullanıcılar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    form.reset({
      firstName: selected.firstName,
      lastName: selected.lastName,
      email: selected.email ?? '',
      status: selected.status as 'ACTIVE' | 'INACTIVE' | 'BANNED',
    });
  }, [selected]);

  async function save(v: UserForm): Promise<void> {
    if (!selected) return;
    try {
      setError(null);
      const body: Record<string, unknown> = {};
      if (v.firstName !== undefined) body.firstName = v.firstName;
      if (v.lastName !== undefined) body.lastName = v.lastName;
      if (v.email !== undefined && v.email !== '') body.email = v.email;
      if (v.status !== undefined) body.status = v.status;
      await adminFetch(`/users/${selected.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setSelected(null);
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kullanıcı güncellenemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        header: 'Ad Soyad',
        cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
      },
      { header: 'Telefon', accessorKey: 'phone' },
      { header: 'E-posta', accessorKey: 'email' },
      { header: 'Rol', cell: ({ row }) => row.original.role.name },
      {
        header: 'Durum',
        cell: ({ row }) => {
          const s = row.original.status;
          if (s === 'ACTIVE') return 'Aktif';
          if (s === 'INACTIVE') return 'Pasif';
          if (s === 'BANNED') return 'Yasaklı';
          return s;
        },
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) =>
          can(permissions, ['users.update']) ? (
            <button type="button" className="text-amber-800" onClick={() => setSelected(row.original)}>
              Düzenle
            </button>
          ) : (
            <span className="text-stone-400">—</span>
          ),
      },
    ],
    [permissions],
  );

  if (loading) return <LoadingState label="Kullanıcılar yükleniyor…" />;

  return (
    <PageSection title="Kullanıcılar" description="Listeleme ve profil güncelleme (telefon değişmez).">
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DataTable data={rows} columns={columns} />
        {selected && can(permissions, ['users.update']) ? (
          <form className="space-y-3 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(save)}>
            <h2 className="font-semibold">Kullanıcı düzenle</h2>
            <p className="text-sm text-stone-600">
              {selected.firstName} {selected.lastName} — {selected.phone}
            </p>
            <p className="text-xs text-stone-500">Rol: {selected.role.name}</p>
            <Field label="Ad" error={form.formState.errors.firstName?.message}>
              <input className="w-full rounded-2xl border px-3 py-2" {...form.register('firstName')} />
            </Field>
            <Field label="Soyad" error={form.formState.errors.lastName?.message}>
              <input className="w-full rounded-2xl border px-3 py-2" {...form.register('lastName')} />
            </Field>
            <Field label="E-posta" error={form.formState.errors.email?.message}>
              <input className="w-full rounded-2xl border px-3 py-2" type="email" {...form.register('email')} />
            </Field>
            <Field label="Durum" error={form.formState.errors.status?.message}>
              <select className="w-full rounded-2xl border px-3 py-2" {...form.register('status')}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
                <option value="BANNED">Yasaklı</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
                Kaydet
              </button>
              <button type="button" className="rounded-2xl border px-4 py-2" onClick={() => setSelected(null)}>
                İptal
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-stone-600">Düzenlemek için bir kullanıcı seçin.</p>
        )}
      </div>
    </PageSection>
  );
}
