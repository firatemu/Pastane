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
import { ErrorState, LoadingState } from '../shared/async-state';
import { adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '../shared/admin-form-controls';

function formatCourierLabel(c: Courier): string {
  return `${c.user.firstName} ${c.user.lastName} (${c.user.phone})`;
}

function CourierAvatar({ firstName, lastName }: { firstName: string; lastName: string }): React.JSX.Element {
  const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary font-bold text-[13px] tracking-wider uppercase">
      {initials}
    </div>
  );
}

export function CouriersManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Courier | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const createForm = useForm<CreateCourierForm>({
    resolver: zodResolver(createCourierFormSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '', vehicle: '' },
  });

  const editForm = useForm<UpdateCourierForm>({
    resolver: zodResolver(updateCourierFormSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', newPassword: '', vehicle: '' },
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

  useEffect(() => { void load(); }, []);

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
      createForm.reset({ firstName: '', lastName: '', phone: '', email: '', password: '', vehicle: '' });
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
      await adminFetch<Courier>(`/couriers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
      setMode('create');
      editForm.reset();
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kurye güncellenemedi.'));
    }
  }

  async function deactivateCourier(c: Courier): Promise<void> {
    if (!window.confirm(`${formatCourierLabel(c)} hesabını devre dışı bırakmak istediğinize emin misiniz? Aktif teslimatı varsa işlem reddedilir.`)) return;
    try {
      setError(null);
      await adminFetch(`/couriers/${c.id}/deactivate`, { method: 'POST' });
      await load();
      if (editing?.id === c.id) { setEditing(null); setMode('create'); }
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kurye devre dışı bırakılamadı.'));
    }
  }

  async function reactivateCourier(c: Courier): Promise<void> {
    if (!window.confirm(`${formatCourierLabel(c)} hesabını yeniden etkinleştirmek istediğinize emin misiniz?`)) return;
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
        cell: ({ row }) => {
          const u = row.original.user;
          return (
            <div className="flex items-center gap-2.5 min-w-[150px]">
              <CourierAvatar firstName={u.firstName} lastName={u.lastName} />
              <div>
                <p className="font-semibold text-on-surface">{u.firstName} {u.lastName}</p>
                <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                  <span className="material-symbols-outlined text-[13px] text-outline">call</span>
                  <span>{u.phone}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: 'E-posta',
        cell: ({ row }) => {
          const email = row.original.user.email;
          return email ? (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant min-w-[160px]">
              <span className="material-symbols-outlined text-[14px] text-outline shrink-0">mail</span>
              <span className="truncate" title={email}>{email}</span>
            </div>
          ) : (
            <span className="text-xs text-outline italic whitespace-nowrap">E-posta yok</span>
          );
        },
      },
      {
        header: 'Araç',
        cell: ({ row }) => {
          const v = row.original.vehicle;
          return v ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container px-2.5 py-0.5 text-xs font-medium text-on-surface-variant whitespace-nowrap">
              <span className="material-symbols-outlined text-[13px]">electric_bike</span>
              <span>{v}</span>
            </div>
          ) : (
            <span className="text-xs text-outline italic whitespace-nowrap">—</span>
          );
        },
      },
      {
        header: 'Durum',
        cell: ({ row }) => {
          const removed = Boolean(row.original.deletedAt);
          if (removed) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full border border-error/25 bg-error-container px-2.5 py-0.5 text-xs font-semibold text-error whitespace-nowrap">
                <span className="material-symbols-outlined text-[13px]">block</span>
                Pasif (kapalı)
              </span>
            );
          }
          if (row.original.status === 'ACTIVE') {
            return (
              <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Aktif
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
              <span className="material-symbols-outlined text-[13px]">cancel</span>
              Pasif
            </span>
          );
        },
      },
      {
        header: 'Teslimat',
        cell: ({ row }) => {
          const count = row.original._count?.deliveries ?? 0;
          return (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
              <span className="material-symbols-outlined text-[14px] text-outline">package_2</span>
              <span>{count}</span>
            </div>
          );
        },
      },
      {
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {can(permissions, ['couriers.update']) ? (
              <>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate transition shadow-sm hover:scale-105 active:scale-95"
                  title="Düzenle"
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
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                {!row.original.deletedAt ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-error/30 bg-error-container/20 text-error hover:bg-error hover:text-white transition shadow-sm hover:scale-105 active:scale-95"
                    title="Devre dışı bırak"
                    onClick={() => void deactivateCourier(row.original)}
                  >
                    <span className="material-symbols-outlined text-[18px]">person_off</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-tertiary/30 bg-tertiary-container/30 text-tertiary hover:bg-tertiary hover:text-white transition shadow-sm hover:scale-105 active:scale-95"
                    title="Etkinleştir"
                    onClick={() => void reactivateCourier(row.original)}
                  >
                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-outline italic">—</span>
            )}
          </div>
        ),
      },
    ],
    [permissions],
  );

  const canCreate = can(permissions, ['couriers.create']);
  const canUpdate = can(permissions, ['couriers.update']);

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">Kurye Yönetimi</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Kurye hesapları telefon ve şifre ile panele giriş yapar. Şifre yalnızca oluştururken veya "Yeni şifre" alanı doldurulduğunda değişir.
        </p>
      </header>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState label="Kuryeler yükleniyor…" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Table */}
          <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
            <DataTable data={rows} columns={columns} />
          </div>

          {/* Side panel */}
          {(canCreate || canUpdate) ? (
            <div className="relative">
              {/* CREATE FORM */}
              {mode === 'create' && !editing && canCreate ? (
                <form
                  className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery sticky top-4"
                  onSubmit={createForm.handleSubmit(submitCreate)}
                >
                  <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
                    <span className="material-symbols-outlined text-[22px] text-chocolate">electric_bike</span>
                    <h2 className="font-display text-xl font-semibold text-on-surface">Yeni Kurye</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ad" error={createForm.formState.errors.firstName?.message}>
                      <input className={adminInputClass} autoComplete="off" {...createForm.register('firstName')} />
                    </Field>
                    <Field label="Soyad" error={createForm.formState.errors.lastName?.message}>
                      <input className={adminInputClass} autoComplete="off" {...createForm.register('lastName')} />
                    </Field>
                  </div>

                  <Field label="Telefon" error={createForm.formState.errors.phone?.message}>
                    <input className={adminInputClass} autoComplete="off" placeholder="905XXXXXXXXX" {...createForm.register('phone')} />
                  </Field>
                  <Field label="E-posta (isteğe bağlı)" error={createForm.formState.errors.email?.message}>
                    <input className={adminInputClass} type="email" autoComplete="off" {...createForm.register('email')} />
                  </Field>
                  <Field label="Şifre" error={createForm.formState.errors.password?.message}>
                    <input className={adminInputClass} type="password" autoComplete="new-password" placeholder="En az 8 karakter" {...createForm.register('password')} />
                  </Field>
                  <Field label="Araç bilgisi (isteğe bağlı)" error={createForm.formState.errors.vehicle?.message}>
                    <input className={adminInputClass} placeholder="Motosiklet, bisiklet…" {...createForm.register('vehicle')} />
                  </Field>

                  <div className="pt-2 border-t border-outline-variant/35">
                    <button className={`${adminPrimaryButtonClass} w-full`} type="submit" disabled={createForm.formState.isSubmitting}>
                      {createForm.formState.isSubmitting ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">person_add</span>
                          Kurye Oluştur
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : null}

              {/* EDIT FORM */}
              {mode === 'edit' && editing && canUpdate ? (
                <form
                  className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery sticky top-4"
                  onSubmit={editForm.handleSubmit(submitEdit)}
                >
                  <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
                    <span className="material-symbols-outlined text-[22px] text-chocolate">edit</span>
                    <h2 className="font-display text-xl font-semibold text-on-surface">Kurye Düzenle</h2>
                  </div>

                  {/* Info card */}
                  <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3.5">
                    <CourierAvatar firstName={editing.user.firstName} lastName={editing.user.lastName} />
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{editing.user.firstName} {editing.user.lastName}</p>
                      <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">call</span>
                        <span>{editing.user.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ad" error={editForm.formState.errors.firstName?.message}>
                      <input className={adminInputClass} {...editForm.register('firstName')} />
                    </Field>
                    <Field label="Soyad" error={editForm.formState.errors.lastName?.message}>
                      <input className={adminInputClass} {...editForm.register('lastName')} />
                    </Field>
                  </div>

                  <Field label="Telefon" error={editForm.formState.errors.phone?.message}>
                    <input className={adminInputClass} {...editForm.register('phone')} />
                  </Field>
                  <Field label="E-posta (isteğe bağlı)" error={editForm.formState.errors.email?.message}>
                    <input className={adminInputClass} type="email" {...editForm.register('email')} />
                  </Field>
                  <Field label="Yeni şifre (isteğe bağlı)" error={editForm.formState.errors.newPassword?.message}>
                    <input className={adminInputClass} type="password" autoComplete="new-password" placeholder="Değiştirmek istemiyorsanız boş bırakın" {...editForm.register('newPassword')} />
                  </Field>
                  <Field label="Araç bilgisi (isteğe bağlı)" error={editForm.formState.errors.vehicle?.message}>
                    <input className={adminInputClass} {...editForm.register('vehicle')} />
                  </Field>

                  <div className="flex gap-2 pt-2 border-t border-outline-variant/35">
                    <button className={`${adminPrimaryButtonClass} flex-1`} type="submit" disabled={editForm.formState.isSubmitting}>
                      {editForm.formState.isSubmitting ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">save</span>
                          Kaydet
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className={adminSecondaryButtonClass}
                      onClick={() => { setEditing(null); setMode('create'); editForm.reset(); }}
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
