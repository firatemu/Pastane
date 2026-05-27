'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { adminUserUpdateSchema } from '../../lib/operations/schemas';
import type { AdminRoleRow, AdminUserRow } from '../../lib/operations/types';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { adminInputClass, adminSelectClass } from '../shared/admin-form-controls';
import { ConfirmSoftDeleteDialog } from './confirm-soft-delete-dialog';
import { UserDetailModal } from './user-detail-modal';
import { UserFormSheet } from './user-form-sheet';
import { UsersList } from './users-list';
import { UsersStatsBar } from './users-stats-bar';

type UserForm = z.infer<typeof adminUserUpdateSchema>;

const ROLE_OPTIONS = ['ADMIN', 'ORDER_OPERATOR', 'PRODUCT_MANAGER', 'COURIER'] as const;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Sistem Yöneticisi',
  ORDER_OPERATOR: 'Operasyon Sorumlusu',
  PRODUCT_MANAGER: 'Ürün Yöneticisi',
  COURIER: 'Kurye',
  CUSTOMER: 'Müşteri',
};

function roleLabel(roleName: string): string {
  return ROLE_LABELS[roleName] ?? roleName;
}

function roleSortIndex(roleName: string): number {
  const index = ROLE_OPTIONS.findIndex((option) => option === roleName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function UsersManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<UserForm>({
    resolver: zodResolver(adminUserUpdateSchema),
    defaultValues: {},
  });

  const canEdit = can(permissions, ['users.update']);
  const canDelete = can(permissions, ['users.delete']);

  async function load(): Promise<void> {
    try {
      setError(null);
      const data = await adminFetch<AdminUserRow[]>('/users?scope=staff');
      setRows(data);
      setSelected((prev) => (prev ? data.find((user) => user.id === prev.id) ?? null : null));
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Personel hesapları yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles(): Promise<void> {
    if (!can(permissions, ['roles.view'])) return;
    try {
      const data = await adminFetch<AdminRoleRow[]>('/roles');
      setRoles(data);
    } catch {
      setRoles([]);
    }
  }

  useEffect(() => {
    void load();
    void loadRoles();
  }, [permissions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((user) => {
      if (roleFilter && user.role.name !== roleFilter) return false;
      if (statusFilter && user.status !== statusFilter) return false;
      if (!query) return true;

      return (
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        (user.email?.toLowerCase().includes(query) ?? false) ||
        user.phone.includes(query) ||
        roleLabel(user.role.name).toLowerCase().includes(query)
      );
    });
  }, [rows, search, roleFilter, statusFilter]);

  async function submit(values: UserForm): Promise<void> {
    if (!editing) return;
    try {
      setError(null);
      const body: Record<string, unknown> = {};
      if (values.firstName !== undefined) body.firstName = values.firstName;
      if (values.lastName !== undefined) body.lastName = values.lastName;
      if (values.phone !== undefined) body.phone = values.phone;
      if (values.email !== undefined) body.email = values.email;
      if (values.status !== undefined) body.status = values.status;
      if (values.roleName !== undefined) body.roleName = values.roleName;

      const saved = await adminFetch<AdminUserRow>(`/users/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      setSelected(saved);
      setEditing(null);
      setFormOpen(false);
      form.reset({});
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Personel hesabı güncellenemedi.'));
    }
  }

  async function toggleStatus(row: AdminUserRow): Promise<void> {
    try {
      setError(null);
      const newStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await adminFetch(`/users/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Personel durumu güncellenemedi.'));
    }
  }

  async function deleteUser(): Promise<void> {
    if (!deleteTarget) return;
    try {
      setDeleteBusy(true);
      setError(null);
      await adminFetch(`/users/${deleteTarget.id}`, { method: 'DELETE' });
      setSelected((prev) => (prev?.id === deleteTarget.id ? null : prev));
      setEditing((prev) => (prev?.id === deleteTarget.id ? null : prev));
      setDeleteTarget(null);
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Personel hesabı kaldırılamadı.'));
    } finally {
      setDeleteBusy(false);
    }
  }

  function openEdit(user: AdminUserRow): void {
    setEditing(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email ?? '',
      status: user.status as 'ACTIVE' | 'INACTIVE' | 'BANNED',
      roleName: user.role.name as UserForm['roleName'],
    });
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    form.reset({});
  }

  const roleOptions = useMemo(() => {
    const roleNames = roles.length
      ? roles.map((role) => role.name).filter((roleName) => roleName !== 'CUSTOMER')
      : [...ROLE_OPTIONS];

    return roleNames
      .filter((roleName, index, self) => self.indexOf(roleName) === index)
      .sort((a, b) => roleSortIndex(a) - roleSortIndex(b));
  }, [roles]);

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
          Personel ve Sistem Hesapları
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Operasyon ekibini, sistem yöneticilerini ve kurye hesaplarını yönetin. Profil, rol, erişim ve güvenli
          soft delete işlemleri bu çalışma alanından yürütülür.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Personel hesapları yükleniyor…" />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          <UsersStatsBar users={rows} />

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
                    placeholder="Ad, soyad, telefon veya rol…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Rol</span>
                <select className={adminSelectClass} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                  <option value="">Tümü</option>
                  {roleOptions.map((roleName) => (
                    <option key={roleName} value={roleName}>
                      {roleLabel(roleName)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Durum</span>
                <select className={adminSelectClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">Tümü</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                  <option value="BANNED">Yasaklı</option>
                </select>
              </label>
            </div>
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} personel hesabı listeleniyor`
              : `${filtered.length} / ${rows.length} personel hesabı (filtreli)`}
          </p>

          <UsersList
            users={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            onToggleStatus={toggleStatus}
            onDelete={(user) => setDeleteTarget(user)}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      )}

      <UserDetailModal
        user={selected}
        roles={roles}
        permissions={permissions}
        onEdit={() => {
          if (!selected) return;
          const user = selected;
          setSelected(null);
          openEdit(user);
        }}
        onDelete={() => {
          if (!selected) return;
          setDeleteTarget(selected);
        }}
        onClose={() => setSelected(null)}
      />

      {canEdit ? (
        <UserFormSheet
          open={formOpen}
          editing={editing}
          form={form}
          roleOptions={roleOptions}
          onClose={closeForm}
          onSubmit={submit}
        />
      ) : null}

      <ConfirmSoftDeleteDialog
        open={deleteTarget !== null}
        busy={deleteBusy}
        title="Personel hesabını kaldır"
        description={
          deleteTarget
            ? `${deleteTarget.firstName} ${deleteTarget.lastName} hesabı aktif listelerden kaldırılacak, oturumları kapatılacak ve tarihsel operasyon kayıtları korunacaktır.`
            : ''
        }
        confirmLabel="Personeli kaldır"
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteUser}
      />
    </section>
  );
}
