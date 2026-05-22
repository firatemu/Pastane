'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { adminUserUpdateSchema } from '../../lib/operations/schemas';
import type { AdminRoleRow, AdminUserRow } from '../../lib/operations/types';
import { ErrorState, LoadingState } from '../shared/async-state';
import {
  adminInputClass,
  adminSelectClass,
} from '../shared/admin-form-controls';
import { UsersStatsBar } from './users-stats-bar';
import { UsersList } from './users-list';
import { UserDetailModal } from './user-detail-modal';
import { UserFormSheet } from './user-form-sheet';

type UserForm = z.infer<typeof adminUserUpdateSchema>;

const ROLE_OPTIONS = ['ADMIN', 'ORDER_OPERATOR', 'PRODUCT_MANAGER', 'COURIER', 'CUSTOMER'] as const;

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
  
  // Design element state matching ProductsManager
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const form = useForm<UserForm>({
    resolver: zodResolver(adminUserUpdateSchema),
    defaultValues: {},
  });

  const canEdit = can(permissions, ['users.update']);

  async function load(): Promise<void> {
    try {
      setError(null);
      const data = await adminFetch<AdminUserRow[]>('/users');
      setRows(data);
      setSelected((prev) => (prev ? data.find((u) => u.id === prev.id) ?? null : null));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kullanıcılar yüklenemedi.'));
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

  // Filtering logic matching ProductsManager useMemo
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((user) => {
      if (roleFilter && user.role.name !== roleFilter) return false;
      if (statusFilter && user.status !== statusFilter) return false;
      if (!q) return true;
      return (
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q) ||
        (user.email?.toLowerCase().includes(q) ?? false) ||
        user.phone.includes(q) ||
        roleLabel(user.role.name).toLowerCase().includes(q)
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
      if (values.email !== undefined && values.email !== '') body.email = values.email;
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
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kullanıcı güncellenemedi.'));
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
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kullanıcı durumu güncellenemedi.'));
    }
  }

  function openEdit(user: AdminUserRow): void {
    setEditing(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
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
    const roleNames = roles.length ? roles.map((role) => role.name) : [...ROLE_OPTIONS];
    return roleNames
      .filter((roleName, index, self) => self.indexOf(roleName) === index)
      .sort((a, b) => roleSortIndex(a) - roleSortIndex(b));
  }, [roles]);

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">Kullanıcılar</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Sistem kullanıcıları ve müşteri hesaplarını arayın, filtreleyin ve detay panelinden profil bilgileri ile yetkilerini yönetin.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Kullanıcılar yükleniyor…" />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          {/* New UsersStatsBar matching ProductsStatsBar */}
          <UsersStatsBar users={rows} />

          {/* Search and filter row matching ProductsManager exactly */}
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
                    placeholder="Ad, soyad, e-posta veya telefon…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Rol</span>
                <select className={adminSelectClass} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
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
                <select className={adminSelectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
              ? `${rows.length} kullanıcı listeleniyor`
              : `${filtered.length} / ${rows.length} kullanıcı (filtreli)`}
          </p>

          {/* New custom UsersList table matching ProductsList */}
          <UsersList
            users={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            onToggleStatus={toggleStatus}
            canEdit={canEdit}
          />
        </div>
      )}

      {/* Centered tabs detail modal matching ProductDetailModal */}
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
        onClose={() => setSelected(null)}
      />

      {/* Slide-over form side sheet matching ProductFormSheet */}
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
    </section>
  );
}
