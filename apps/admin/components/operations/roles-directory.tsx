'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { AdminRoleRow, PermissionsManagementResponse } from '../../lib/operations/types';
import { ErrorState, LoadingState } from '../shared/async-state';

/* ─────────────────────── Sabitler ─────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Sistem Yöneticisi',
  ORDER_OPERATOR: 'Operasyon Sorumlusu',
  PRODUCT_MANAGER: 'Ürün Yöneticisi',
  COURIER: 'Kurye',
  CUSTOMER: 'Müşteri',
};

const ROLE_ORDER = ['ADMIN', 'ORDER_OPERATOR', 'PRODUCT_MANAGER', 'COURIER', 'CUSTOMER'];

const ROLE_HINTS: Record<string, string> = {
  ADMIN: 'Tüm yönetim paneli ve sistem ayarlarına tam erişim.',
  ORDER_OPERATOR: 'Sipariş akışı, kurye atama ve operasyon takibi için tasarlanmıştır.',
  PRODUCT_MANAGER: 'Katalog, ürün içeriği, medya ve kampanya operasyonlarını yönetir.',
  COURIER: 'Kendi teslimatlarını görüntüler ve teslimat durumunu günceller.',
  CUSTOMER: 'Müşteri uygulamasında sipariş, ödeme, adres ve sadakat işlemlerini yürütür.',
};

const MODULE_LABELS: Record<string, string> = {
  addresses: 'Adresler',
  allergens: 'Alerjenler',
  audit: 'Denetim',
  banners: 'Bannerlar',
  campaigns: 'Kampanyalar',
  cart: 'Sepet',
  categories: 'Kategoriler',
  couriers: 'Kuryeler',
  customers: 'Müşteriler',
  deliveries: 'Teslimatlar',
  loyalty: 'Sadakat',
  media: 'Medya',
  notifications: 'Bildirimler',
  orders: 'Siparişler',
  payments: 'Ödemeler',
  permissions: 'İzinler',
  products: 'Ürünler',
  reports: 'Raporlar',
  reviews: 'Yorumlar',
  roles: 'Roller',
  settings: 'Ayarlar',
  users: 'Kullanıcılar',
};

const ACTION_LABELS: Record<string, string> = {
  assignCourier: 'Kurye atama',
  cancel: 'İptal',
  changeStatus: 'Durum değiştirme',
  create: 'Oluşturma',
  delete: 'Silme',
  initiate: 'Başlatma',
  manage: 'Yönetim',
  manageAllergens: 'Alerjen yönetimi',
  manageImages: 'Görsel yönetimi',
  manageOptions: 'Seçenek yönetimi',
  manageOwn: 'Kendi kayıtlarını yönetme',
  manageSettings: 'Ayar yönetimi',
  moderate: 'Moderasyon',
  performance: 'Performans',
  redeem: 'Puan kullandırma',
  refund: 'İade',
  reorder: 'Sıralama',
  sales: 'Satış raporu',
  scan: 'QR puan işlemi',
  send: 'Gönderim',
  update: 'Güncelleme',
  updateOwn: 'Kendi teslimatını güncelleme',
  updateStatus: 'Durum güncelleme',
  upload: 'Yükleme',
  view: 'Görüntüleme',
  viewAll: 'Tüm kayıtları görüntüleme',
  viewOwn: 'Kendi kayıtlarını görüntüleme',
  viewReports: 'Rapor görüntüleme',
};

const ROLE_ICONS: Record<string, string> = {
  ADMIN: 'admin_panel_settings',
  ORDER_OPERATOR: 'support_agent',
  PRODUCT_MANAGER: 'inventory_2',
  COURIER: 'local_shipping',
  CUSTOMER: 'person',
};

const MODULE_ICONS: Record<string, string> = {
  addresses: 'location_on',
  allergens: 'no_meals',
  audit: 'history',
  banners: 'view_carousel',
  campaigns: 'campaign',
  cart: 'shopping_cart',
  categories: 'category',
  customers: 'person_search',
  couriers: 'electric_bike',
  deliveries: 'local_shipping',
  loyalty: 'card_membership',
  media: 'perm_media',
  notifications: 'notifications_active',
  orders: 'shopping_bag',
  payments: 'payments',
  permissions: 'lock_person',
  products: 'bakery_dining',
  reports: 'bar_chart',
  reviews: 'star_rate',
  roles: 'admin_panel_settings',
  settings: 'settings',
  users: 'group',
};

/* ─────────────────────── Yardımcılar ─────────────────────── */

function moduleLabel(name: string): string {
  return MODULE_LABELS[name] ?? name;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function moduleIcon(name: string): string {
  return MODULE_ICONS[name] ?? 'tune';
}

function permissionModuleName(code: string): string {
  return code.split('.')[0] ?? code;
}

function permissionActionName(code: string): string {
  return code.split('.')[1] ?? '';
}

function roleLabel(name: string): string {
  return ROLE_LABELS[name] ?? name;
}

interface PermissionGroup {
  moduleName: string;
  permissions: Array<{ id: string; code: string; action: string; description: string | null }>;
}

function groupPermissionsByModule(
  permissions: Array<{ id: string; code: string; description: string | null }>,
): PermissionGroup[] {
  const map = new Map<string, PermissionGroup['permissions']>();

  for (const perm of permissions) {
    const moduleName = permissionModuleName(perm.code);
    const action = permissionActionName(perm.code);
    const list = map.get(moduleName) ?? [];
    list.push({ id: perm.id, code: perm.code, action, description: perm.description });
    map.set(moduleName, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'tr', { sensitivity: 'base' }))
    .map(([moduleName, permissions]) => ({
      moduleName,
      permissions: permissions.sort((a, b) => a.action.localeCompare(b.action, 'tr', { sensitivity: 'base' })),
    }));
}

/* ─────────────────────── Ana Bileşen ─────────────────────── */

export function RolesDirectory({ canManage }: { canManage: boolean }): React.JSX.Element {
  const [managementData, setManagementData] = useState<PermissionsManagementResponse | null>(null);
  const [rolesData, setRolesData] = useState<AdminRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Düzenleme state
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPermissionIds, setEditPermissionIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const [management, roles] = await Promise.all([
        adminFetch<PermissionsManagementResponse>('/permissions/management'),
        adminFetch<AdminRoleRow[]>('/roles'),
      ]);
      setManagementData(management);
      setRolesData(roles);
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Veriler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const allPermissions = managementData?.permissions ?? [];
  const managementRoles = managementData?.roles ?? [];

  const permissionGroups = useMemo(() => groupPermissionsByModule(allPermissions), [allPermissions]);

  const sortedRoles = useMemo(() => {
    return [...rolesData].sort((a, b) => {
      const aIdx = ROLE_ORDER.indexOf(a.name);
      const bIdx = ROLE_ORDER.indexOf(b.name);
      if (aIdx !== -1 || bIdx !== -1) {
        return (aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx) - (bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx);
      }
      return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
    });
  }, [rolesData]);

  const stats = useMemo(() => {
    const uniquePermissions = new Set(allPermissions.map((p) => p.code));
    const moduleCount = new Set([...uniquePermissions].map(permissionModuleName)).size;
    const adminRole = sortedRoles.find((r) => r.name === 'ADMIN');
    const adminCodes = adminRole ? adminRole.permissions.map((rp) => rp.permission.code) : [];

    return {
      roleCount: sortedRoles.length,
      permissionCount: uniquePermissions.size,
      moduleCount,
      adminPermissionCount: adminCodes.length,
    };
  }, [allPermissions, sortedRoles]);

  function getRolePermissionIds(roleName: string): string[] {
    const mRole = managementRoles.find((r) => r.name === roleName);
    return mRole?.permissionIds ?? [];
  }

  function isRoleEditable(roleName: string): boolean {
    if (!canManage) return false;
    const mRole = managementRoles.find((r) => r.name === roleName);
    return mRole?.editable ?? false;
  }

  function startEdit(roleName: string): void {
    setEditingRole(roleName);
    setEditPermissionIds(new Set(getRolePermissionIds(roleName)));
    setSaveError(null);
  }

  function cancelEdit(): void {
    setEditingRole(null);
    setEditPermissionIds(new Set());
    setSaveError(null);
  }

  function togglePermission(permissionId: string): void {
    setEditPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  }

  function toggleAllModule(moduleName: string, enable: boolean): void {
    const modulePermissions = permissionGroups.find((g) => g.moduleName === moduleName)?.permissions ?? [];
    setEditPermissionIds((prev) => {
      const next = new Set(prev);
      for (const perm of modulePermissions) {
        if (enable) {
          next.add(perm.id);
        } else {
          next.delete(perm.id);
        }
      }
      return next;
    });
  }

  async function savePermissions(): Promise<void> {
    if (!editingRole) return;
    setSaving(true);
    setSaveError(null);
    try {
      await adminFetch(`/permissions/roles/${editingRole}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissionIds: [...editPermissionIds] }),
      });
      setEditingRole(null);
      setEditPermissionIds(new Set());
      await loadData();
    } catch (e) {
      setSaveError(adminMessageFromUnknownError(e, 'İzinler kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Roller yükleniyor…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">Rol ve Yetki Yönetimi</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Erişim seviyelerini, rol kapsamlarını ve modül bazlı izin dağılımını yönetin.
          </p>
        </div>
        {canManage ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Düzenleme aktif
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-xs font-semibold text-secondary">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Salt okunur
          </span>
        )}
      </div>

      {/* Özet Kartları */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile icon="admin_panel_settings" label="Tanımlı rol" value={stats.roleCount} />
        <SummaryTile icon="verified_user" label="Benzersiz izin" value={stats.permissionCount} />
        <SummaryTile icon="apps" label="Yetkili modül" value={stats.moduleCount} />
        <SummaryTile icon="workspace_premium" label="Admin izin kapsamı" value={stats.adminPermissionCount} />
      </div>

      {/* Rol Kartları */}
      <div className="space-y-3">
        {sortedRoles.map((role) => {
          const isExpanded = expandedRole === role.name;
          const isEditing = editingRole === role.name;
          const editable = isRoleEditable(role.name);
          const rolePermissionCodes = role.permissions.map((rp) => rp.permission.code);
          const rolePermissionIds = getRolePermissionIds(role.name);

          return (
            <div
              key={role.name}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
                isEditing ? 'border-amber-300 ring-2 ring-amber-200' : 'border-outline-variant'
              }`}
            >
              {/* Kart Header */}
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-container-lowest sm:p-5"
                onClick={() => setExpandedRole(isExpanded ? null : role.name)}
              >
                <span className="material-symbols-outlined text-[24px] text-secondary">
                  {ROLE_ICONS[role.name] ?? 'badge'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-on-surface">{roleLabel(role.name)}</span>
                    <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-outline">
                      {role.name}
                    </span>
                    {!editable && canManage ? (
                      <span className="material-symbols-outlined text-[16px] text-outline" title="Bu rol düzenlenemez">
                        lock
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-on-surface-variant">{ROLE_HINTS[role.name] ?? role.description ?? ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-primary">
                    {rolePermissionCodes.length} izin
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-outline transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }}>
                    expand_more
                  </span>
                </div>
              </button>

              {/* Genişletilmiş İçerik */}
              {isExpanded ? (
                <div className="border-t border-outline-variant">
                  {/* Düzenleme toolbar'ı */}
                  {canManage && editable && !isEditing ? (
                    <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 py-2.5 sm:px-5">
                      <p className="text-xs text-on-surface-variant">
                        Bu rolün izinlerini düzenleyebilirsiniz.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition hover:opacity-90"
                        onClick={() => startEdit(role.name)}
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Düzenle
                      </button>
                    </div>
                  ) : null}

                  {/* Düzenleme modu toolbar'ı */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-amber-700">edit</span>
                        <p className="text-sm font-medium text-amber-900">
                          Düzenleme modu — <span className="font-bold">{editPermissionIds.size}</span> izin seçili
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-[36px] items-center rounded-lg border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface transition hover:bg-surface-container-lowest disabled:opacity-50"
                          disabled={saving}
                          onClick={cancelEdit}
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-50"
                          disabled={saving}
                          onClick={savePermissions}
                        >
                          {saving ? (
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">save</span>
                          )}
                          {saving ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {saveError ? (
                    <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:mx-5">
                      <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
                      <p className="text-sm text-red-700">{saveError}</p>
                    </div>
                  ) : null}

                  {/* İzin Grid — Tüm modüller */}
                  <div className="p-4 sm:p-5">
                    <div className="space-y-4">
                      {permissionGroups.map((group) => {
                        const assignedInGroup = isEditing
                          ? group.permissions.filter((p) => editPermissionIds.has(p.id)).length
                          : group.permissions.filter((p) => rolePermissionIds.includes(p.id)).length;
                        const allSelected = assignedInGroup === group.permissions.length;

                        return (
                          <div key={group.moduleName} className="rounded-lg border border-outline-variant bg-surface-container-lowest">
                            {/* Modül başlığı */}
                            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-3 py-2.5 sm:px-4">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-secondary">
                                  {moduleIcon(group.moduleName)}
                                </span>
                                <span className="text-sm font-semibold text-on-surface">{moduleLabel(group.moduleName)}</span>
                                <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-outline">
                                  {assignedInGroup}/{group.permissions.length}
                                </span>
                              </div>
                              {isEditing ? (
                                <button
                                  type="button"
                                  className="text-xs font-medium text-primary hover:underline"
                                  onClick={() => toggleAllModule(group.moduleName, !allSelected)}
                                >
                                  {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                </button>
                              ) : null}
                            </div>

                            {/* İzin chip'leri */}
                            <div className="flex flex-wrap gap-1.5 p-3 sm:p-4">
                              {group.permissions.map((perm) => {
                                const isChecked = isEditing
                                  ? editPermissionIds.has(perm.id)
                                  : rolePermissionIds.includes(perm.id);

                                if (isEditing) {
                                  return (
                                    <label
                                      key={perm.id}
                                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition ${
                                        isChecked
                                          ? 'border-primary bg-primary-container text-primary'
                                          : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-lowest'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm.id)}
                                      />
                                      <span className={`material-symbols-outlined text-[14px] ${isChecked ? 'text-primary' : 'text-outline'}`}>
                                        {isChecked ? 'check_box' : 'check_box_outline_blank'}
                                      </span>
                                      {actionLabel(perm.action)}
                                    </label>
                                  );
                                }

                                return (
                                  <span
                                    key={perm.id}
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                                      isChecked
                                        ? 'border-primary/20 bg-primary-container/50 text-primary'
                                        : 'border-outline-variant bg-white text-on-surface-variant opacity-50'
                                    }`}
                                    title={perm.description ?? perm.code}
                                  >
                                    {isChecked ? (
                                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                    ) : (
                                      <span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span>
                                    )}
                                    {actionLabel(perm.action)}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── Alt Bileşenler ─────────────────────── */

function SummaryTile({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: number }>): React.JSX.Element {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-bakery">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-[22px] text-secondary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">{value}</p>
    </div>
  );
}