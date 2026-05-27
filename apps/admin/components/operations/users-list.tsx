'use client';

import type { JSX, MouseEvent } from 'react';
import type { AdminUserRow } from '../../lib/operations/types';

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

export function UsersList({
  users,
  selectedId,
  onSelect,
  onEdit,
  onToggleStatus,
  onDelete,
  canEdit,
  canDelete,
}: Readonly<{
  users: AdminUserRow[];
  selectedId: string | null;
  onSelect: (user: AdminUserRow) => void;
  onEdit: (user: AdminUserRow) => void;
  onToggleStatus: (user: AdminUserRow) => Promise<void>;
  onDelete: (user: AdminUserRow) => void;
  canEdit: boolean;
  canDelete: boolean;
}>): JSX.Element {
  if (users.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low px-8 py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
        <p className="mt-4 font-display text-lg font-semibold text-on-surface">Personel hesabı bulunamadı</p>
        <p className="mt-2 text-sm text-on-surface-variant">Arama veya filtreleri değiştirin.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <div className="-mx-gutter overflow-x-auto px-gutter">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/35">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Hesap</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Telefon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">E-posta</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Doğrulama</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Operasyon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Durum</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-[15px]">
            {users.map((user) => {
              const selected = selectedId === user.id;
              const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase();
              const s = user.status;

              return (
                <tr
                  key={user.id}
                  className={`group cursor-pointer transition ${selected ? 'bg-secondary-container/25' : 'hover:bg-surface-variant/35'}`}
                  onClick={() => onSelect(user)}
                >
                  <td className="py-4 pr-4 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chocolate/10 text-chocolate font-bold text-[13px] tracking-wider uppercase">
                        {initials}
                      </div>
                      <span className="font-semibold text-on-surface">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    {user.phone ? (
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant whitespace-nowrap">
                        <span className="material-symbols-outlined text-[16px] text-outline">call</span>
                        <span>{user.phone}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-outline italic whitespace-nowrap">Telefon Yok</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {user.email ? (
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-outline shrink-0">mail</span>
                        <span className="truncate max-w-[150px]" title={user.email}>
                          {user.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-outline italic whitespace-nowrap">E-posta Yok</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-container px-2.5 py-0.5 text-xs font-semibold text-primary whitespace-nowrap">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      <span>{roleLabel(user.role.name)}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    {user.isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Telefon doğrulandı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">pending</span>
                        Bekliyor
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {user.role.name === 'COURIER' ? (
                      <div className="space-y-1 text-xs text-on-surface-variant">
                        <div className="inline-flex items-center gap-1 rounded-full border border-secondary/20 bg-secondary-container px-2.5 py-0.5 font-semibold text-secondary">
                          <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                          {user.courier?._count?.deliveries ?? 0} teslimat
                        </div>
                        <p className="whitespace-nowrap">
                          Kurye durumu: {user.courier?.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-on-surface-variant">Operasyon ekibi hesabı</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {s === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Aktif
                      </span>
                    ) : s === 'INACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Pasif
                      </span>
                    ) : s === 'BANNED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-error/25 bg-error-container px-2.5 py-0.5 text-xs font-semibold text-error whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">block</span>
                        Yasaklı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-outline px-2.5 py-0.5 text-xs font-semibold text-outline whitespace-nowrap">
                        {s}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {canEdit || canDelete ? (
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate transition shadow-sm hover:scale-105 active:scale-95"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onToggleStatus(user);
                              }}
                              title={user.status === 'ACTIVE' ? 'Pasifleştir' : 'Aktifleştir'}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {user.status === 'ACTIVE' ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate transition shadow-sm hover:scale-105 active:scale-95"
                              onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                onEdit(user);
                              }}
                              title="Düzenle"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          </>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-error/25 bg-error-container/40 text-error transition shadow-sm hover:scale-105 hover:bg-error-container active:scale-95"
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation();
                              onDelete(user);
                            }}
                            title="Hesabı kaldır"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-outline italic">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
