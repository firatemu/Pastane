'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { createCourierFormSchema, updateCourierFormSchema, type CreateCourierForm, type UpdateCourierForm } from '../../lib/operations/courier-schemas';
import type { Courier } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

function formatCourierLabel(c: Courier): string {
  return `${c.user.firstName} ${c.user.lastName} (${c.user.phone})`;
}

export function CouriersManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Courier | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const createForm = useForm<CreateCourierForm>({
    resolver: zodResolver(createCourierFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      vehicle: '',
    },
  });

  const editForm = useForm<UpdateCourierForm>({
    resolver: zodResolver(updateCourierFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      newPassword: '',
      vehicle: '',
    },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      const env = await adminFetchEnvelope<Courier[]>('/couriers?includeRemoved=true&limit=100');
      setRows(env.data);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kuryeler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitCreate(values: CreateCourierForm): Promise<void> {
    try {
      setError(null);
      const email = values.email?.trim();
      await adminFetch<Courier>('/couriers', {
        method: 'POST',
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone.trim(),
          password: values.password,
          vehicle: values.vehicle?.trim() || undefined,
          ...(email ? { email } : {}),
        }),
      });
      createForm.reset({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        vehicle: '',
      });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kurye oluşturulamadı.'));
    }
  }

  async function submitEdit(values: UpdateCourierForm): Promise<void> {
    if (!editing) return;
    try {
      setError(null);
      const email = values.email?.trim();
      const body: Record<string, unknown> = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone.trim(),
        vehicle: values.vehicle?.trim() || undefined,
      };
      if (email) body.email = email;
      const np = values.newPassword?.trim();
      if (np) body.newPassword = np;
      await adminFetch<Courier>(`/couriers/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setEditing(null);
      setMode('create');
      editForm.reset();
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kurye güncellenemedi.'));
    }
  }

  async function deactivateCourier(c: Courier): Promise<void> {
    if (!window.confirm(`${formatCourierLabel(c)} hesabını devre dışı bırakmak istediğinize emin misiniz? Aktif teslimatı varsa işlem reddedilir.`)) {
      return;
    }
    try {
      setError(null);
      await adminFetch(`/couriers/${c.id}/deactivate`, { method: 'POST' });
      await load();
      if (editing?.id === c.id) {
        setEditing(null);
        setMode('create');
      }
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kurye devre dışı bırakılamadı.'));
    }
  }

  async function reactivateCourier(c: Courier): Promise<void> {
    if (!window.confirm(`${formatCourierLabel(c)} hesabını yeniden etkinleştirmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      setError(null);
      await adminFetch(`/couriers/${c.id}/reactivate`, { method: 'POST' });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kurye etkinleştirilemedi.'));
    }
  }

  const columns = useMemo<ColumnDef<Courier>[]>(
    () => [
      {
        header: 'Kurye',
        cell: ({ row }) => formatCourierLabel(row.original),
      },
      {
        header: 'E-posta',
        cell: ({ row }) => row.original.user.email ?? '—',
      },
      {
        header: 'Araç',
        accessorKey: 'vehicle',
        cell: ({ row }) => row.original.vehicle ?? '—',
      },
      {
        header: 'Durum',
        cell: ({ row }) => {
          const removed = Boolean(row.original.deletedAt);
          return (
            <span>
              {removed ? 'Pasif (kayıt kapalı)' : row.original.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
            </span>
          );
        },
      },
      {
        header: 'Teslimat sayısı',
        cell: ({ row }) => row.original._count?.deliveries ?? 0,
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {can(permissions, ['couriers.update']) ? (
              <button
                type="button"
                className="text-amber-700"
                onClick={() => {
                  const r = row.original;
                  setEditing(r);
                  setMode('edit');
                  editForm.reset({
                    firstName: r.user.firstName,
                    lastName: r.user.lastName,
                    phone: r.user.phone,
                    email: r.user.email ?? '',
                    newPassword: '',
                    vehicle: r.vehicle ?? '',
                  });
                }}
              >
                Düzenle
              </button>
            ) : null}
            {can(permissions, ['couriers.update']) ? (
              !row.original.deletedAt ? (
                <button type="button" className="text-red-700" onClick={() => void deactivateCourier(row.original)}>
                  Devre dışı
                </button>
              ) : (
                <button type="button" className="text-green-700" onClick={() => void reactivateCourier(row.original)}>
                  Etkinleştir
                </button>
              )
            ) : null}
          </div>
        ),
      },
    ],
    [permissions],
  );

  return (
    <PageSection title="Kurye yönetimi">
      <p className="mb-4 text-sm text-stone-600">
        Kurye paneli girişi telefon ve şifre ile yapılır. Şifre yalnızca oluştururken veya &quot;Yeni şifre&quot; alanı doldurulduğunda
        değişir; kaydedilen şifre ekranda gösterilmez.
      </p>
      {loading ? (
        <LoadingState label="Kuryeler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <DataTable data={rows} columns={columns} />
          <div className="space-y-6">
            {mode === 'create' && !editing && can(permissions, ['couriers.create']) ? (
              <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={createForm.handleSubmit(submitCreate)}>
                <h2 className="font-semibold">Yeni kurye</h2>
                <Field label="Ad" error={createForm.formState.errors.firstName?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" autoComplete="off" {...createForm.register('firstName')} />
                </Field>
                <Field label="Soyad" error={createForm.formState.errors.lastName?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" autoComplete="off" {...createForm.register('lastName')} />
                </Field>
                <Field label="Telefon" error={createForm.formState.errors.phone?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" autoComplete="off" {...createForm.register('phone')} />
                </Field>
                <Field label="E-posta (isteğe bağlı)" error={createForm.formState.errors.email?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" autoComplete="off" {...createForm.register('email')} />
                </Field>
                <Field label="Şifre" error={createForm.formState.errors.password?.message}>
                  <input type="password" className="w-full rounded-2xl border px-3 py-2" autoComplete="new-password" {...createForm.register('password')} />
                </Field>
                <Field label="Araç bilgisi" error={createForm.formState.errors.vehicle?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...createForm.register('vehicle')} />
                </Field>
                <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
                  Oluştur
                </button>
              </form>
            ) : null}
            {mode === 'edit' && editing && can(permissions, ['couriers.update']) ? (
              <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={editForm.handleSubmit(submitEdit)}>
                <h2 className="font-semibold">Kurye düzenle</h2>
                <p className="text-sm text-stone-600">Kurye: {formatCourierLabel(editing)}</p>
                <Field label="Ad" error={editForm.formState.errors.firstName?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('firstName')} />
                </Field>
                <Field label="Soyad" error={editForm.formState.errors.lastName?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('lastName')} />
                </Field>
                <Field label="Telefon" error={editForm.formState.errors.phone?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('phone')} />
                </Field>
                <Field label="E-posta (isteğe bağlı)" error={editForm.formState.errors.email?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('email')} />
                </Field>
                <Field label="Yeni şifre (isteğe bağlı)" error={editForm.formState.errors.newPassword?.message}>
                  <input type="password" className="w-full rounded-2xl border px-3 py-2" autoComplete="new-password" {...editForm.register('newPassword')} />
                </Field>
                <Field label="Araç bilgisi" error={editForm.formState.errors.vehicle?.message}>
                  <input className="w-full rounded-2xl border px-3 py-2" {...editForm.register('vehicle')} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
                    Kaydet
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border px-4 py-2"
                    onClick={() => {
                      setEditing(null);
                      setMode('create');
                      editForm.reset();
                    }}
                  >
                    İptal
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </PageSection>
  );
}
