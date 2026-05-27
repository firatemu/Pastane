'use client';

import { useEffect, useState, type JSX } from 'react';
import type { AdminRoleRow, AdminUserRow } from '../../lib/operations/types';
import { can } from '../../lib/permissions/can';
import { adminSecondaryButtonClass } from '../shared/admin-form-controls';

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

export function UserDetailModal({
  user,
  roles,
  permissions,
  onEdit,
  onDelete,
  onClose,
}: Readonly<{
  user: AdminUserRow | null;
  roles: AdminRoleRow[];
  permissions: string[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}>): JSX.Element | null {
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [user, onClose]);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Detayı kapat"
        className="fixed inset-0 z-[50] bg-chocolate/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[50] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
      >
        <div
          className="pointer-events-auto flex w-full max-w-3xl max-h-[min(90vh,800px)] flex-col overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <UserDetailTabs
            key={user.id}
            user={user}
            roles={roles}
            permissions={permissions}
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={onClose}
            readOnly
          />
        </div>
      </div>
    </>
  );
}

type TabId = 'overview' | 'permissions';

export function UserDetailTabs({
  user,
  roles,
  permissions,
  onEdit,
  onDelete,
  onClose,
  readOnly = false,
}: Readonly<{
  user: AdminUserRow;
  roles: AdminRoleRow[];
  permissions: string[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  readOnly?: boolean;
}>): JSX.Element {
  const [tab, setTab] = useState<TabId>('overview');

  const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase();
  const s = user.status;
  
  // Find detailed role info
  const userRole = roles.find((r) => r.name === user.role.name);

  const tabs = [
    { id: 'overview' as const, label: 'Özet', icon: 'info' },
    { id: 'permissions' as const, label: 'Erişim ve Yetkiler', icon: 'admin_panel_settings' },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-surface-container-lowest">
      {readOnly ? (
        <p className="border-b border-outline-variant/25 bg-surface-container-low px-6 py-2 text-center text-xs font-medium text-on-surface-variant">
          İnceleme modu — değişiklik için Düzenle&apos;ye tıklayın
        </p>
      ) : null}
      <header className="flex flex-col gap-4 border-b border-outline-variant/30 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-chocolate/10 text-chocolate font-bold text-[28px] uppercase">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="user-detail-title" className="font-display text-2xl font-semibold tracking-tight text-on-surface">
                {user.firstName} {user.lastName}
              </h2>
              {s === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                  Aktif
                </span>
              ) : s === 'INACTIVE' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                  Pasif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-error/25 bg-error-container px-2.5 py-0.5 text-xs font-semibold text-error whitespace-nowrap">
                  Yasaklı
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">shield</span>
              {roleLabel(user.role.name)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
              {user.phone && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  {user.phone}
                </span>
              )}
              {user.email && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {can(permissions, ['users.update']) ? (
            <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}>
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Düzenle
            </button>
          ) : null}
          {can(permissions, ['users.delete']) ? (
            <button type="button" className={adminSecondaryButtonClass} onClick={onDelete}>
              <span className="material-symbols-outlined text-[20px]">delete</span>
              Kaldır
            </button>
          ) : null}
          <button type="button" className={adminSecondaryButtonClass} onClick={onClose} aria-label="Detayı kapat">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-outline-variant/25 px-4" aria-label="Kullanıcı sekmeleri">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={
                active
                  ? 'flex items-center gap-2 border-b-2 border-secondary px-4 py-3 text-sm font-semibold text-secondary'
                  : 'flex items-center gap-2 px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:text-on-surface'
              }
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'overview' ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <OverviewBlock title="Ad" body={user.firstName} />
            <OverviewBlock title="Soyad" body={user.lastName} />
            <OverviewBlock title="E-posta Adresi" body={user.email} empty="E-posta tanımlanmamış." />
            <OverviewBlock title="Telefon Numarası" body={user.phone} empty="Telefon numarası tanımlanmamış." />
            <OverviewBlock
              title="Hesap Oluşturma"
              body={user.createdAt ? new Date(user.createdAt).toLocaleString('tr-TR') : null}
              empty="Kayıt tarihi bulunamadı."
            />
            <OverviewBlock
              title="Son Güncelleme"
              body={user.updatedAt ? new Date(user.updatedAt).toLocaleString('tr-TR') : null}
              empty="Güncelleme tarihi bulunamadı."
            />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Telefon Doğrulama</h3>
              <div className="mt-2">
                {user.isPhoneVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 text-tertiary px-3 py-1 text-xs font-medium border border-tertiary/20">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Doğrulandı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-outline-variant/25 text-on-surface-variant px-3 py-1 text-xs font-medium border border-outline-variant/35">
                    <span className="material-symbols-outlined text-[14px]">pending</span>
                    Doğrulanmadı
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Hesap Durumu</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-on-surface font-semibold">
                {s === 'ACTIVE' ? 'Aktif' : s === 'INACTIVE' ? 'Pasif' : 'Yasaklı'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Operasyon Özeti</h3>
              <div className="mt-2 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                {user.role.name === 'COURIER' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary">
                      Kurye durumu: {user.courier?.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                    </span>
                    <span>{user.courier?._count?.deliveries ?? 0} teslimat kaydı</span>
                  </div>
                ) : (
                  <span>Bu hesap operasyon paneli erişimine sahip personel kullanıcısıdır.</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'permissions' ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Kullanıcı Rolü</h3>
              <p className="mt-1 text-[16px] font-semibold text-on-surface">
                {roleLabel(user.role.name)}
              </p>
              <p className="mt-1.5 text-sm text-on-surface-variant leading-relaxed">
                {userRole?.description || 'Bu rol için bir açıklama girilmemiş.'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Erişim Yetkileri ({userRole?.permissions.length ?? 0})</h3>
              {!userRole || userRole.permissions.length === 0 ? (
                <p className="mt-2 text-sm text-on-surface-variant italic">Bu rolün herhangi bir özel yetkisi bulunmuyor.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {userRole.permissions.map(({ permission }) => (
                    <span
                      key={permission.code}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/50 bg-surface-container-low px-2.5 py-1 text-xs font-mono text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[12px] text-outline">key</span>
                      {permission.code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OverviewBlock({
  title,
  body,
  empty = 'Belirtilmemiş',
}: Readonly<{
  title: string;
  body: string | null | undefined;
  empty?: string;
}>): JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-on-surface font-medium">{body?.trim() ? body : empty}</p>
    </div>
  );
}
