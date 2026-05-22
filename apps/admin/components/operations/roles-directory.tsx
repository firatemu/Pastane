'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { AdminRoleRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

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

export function RolesDirectory(): React.JSX.Element {
  const [rows, setRows] = useState<AdminRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setError(null);
        const data = await adminFetch<AdminRoleRow[]>('/roles');
        setRows(
          [...data].sort((a, b) => {
            const aIndex = ROLE_ORDER.indexOf(a.name);
            const bIndex = ROLE_ORDER.indexOf(b.name);

            if (aIndex !== -1 || bIndex !== -1) {
              return (
                (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
                (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
              );
            }

            return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
          }),
        );
      } catch (e) {
        setError(adminMessageFromUnknownError(e, 'Roller yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const columns = useMemo<ColumnDef<AdminRoleRow>[]>(
    () => [
      {
        header: 'Rol',
        cell: ({ row }) => {
          const role = row.original;
          return (
            <div className="min-w-56">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">
                  {roleIcon(role.name)}
                </span>
                <span className="font-semibold text-on-surface">{roleLabel(role.name)}</span>
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-outline">
                {role.name}
              </p>
            </div>
          );
        },
      },
      {
        header: 'Kapsam',
        cell: ({ row }) => (
          <div className="max-w-sm">
            <p className="font-medium text-on-surface">
              {row.original.description ?? roleLabel(row.original.name)}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {ROLE_HINTS[row.original.name] ?? 'Bu rol için tanımlı erişim kapsamı.'}
            </p>
          </div>
        ),
      },
      {
        header: 'Yetki Özeti',
        cell: ({ row }) => <PermissionSummary codes={permissionCodes(row.original)} />,
      },
    ],
    [],
  );

  const stats = useMemo(() => {
    const uniquePermissions = new Set(rows.flatMap(permissionCodes));
    const moduleCount = new Set([...uniquePermissions].map(permissionModuleName)).size;
    const adminRole = rows.find((role) => role.name === 'ADMIN');

    return {
      roleCount: rows.length,
      permissionCount: uniquePermissions.size,
      moduleCount,
      adminPermissionCount: adminRole ? permissionCodes(adminRole).length : 0,
    };
  }, [rows]);

  return (
    <PageSection
      title="Rol ve Yetki Yönetimi"
      description="Yönetim panelindeki erişim seviyelerini, rol kapsamlarını ve modül bazlı izin dağılımını tek ekrandan izleyin."
    >
      {loading ? (
        <LoadingState label="Roller yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile icon="admin_panel_settings" label="Tanımlı rol" value={stats.roleCount} />
            <SummaryTile
              icon="verified_user"
              label="Benzersiz izin"
              value={stats.permissionCount}
            />
            <SummaryTile icon="apps" label="Yetkili modül" value={stats.moduleCount} />
            <SummaryTile
              icon="workspace_premium"
              label="Admin izin kapsamı"
              value={stats.adminPermissionCount}
            />
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Rol matrisi</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  İzin atamaları merkezi seed verisiyle yönetilir; bu ekran güncel yapılandırmayı
                  salt okunur gösterir.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-xs font-semibold text-secondary">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Salt okunur
              </span>
            </div>
          </div>

          <DataTable data={rows} columns={columns} empty="Tanımlı rol bulunamadı." />
        </div>
      )}
    </PageSection>
  );
}

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

function PermissionSummary({ codes }: Readonly<{ codes: string[] }>): React.JSX.Element {
  if (!codes.length) {
    return <span className="text-sm text-outline">Yetki tanımlı değil</span>;
  }

  const modules = groupPermissionCodes(codes);
  const visibleModules = modules.slice(0, 4);
  const hiddenCount = modules.length - visibleModules.length;

  return (
    <div className="max-w-2xl space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleModules.map((module) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface"
            key={module.name}
            title={module.actions.join(', ')}
          >
            <span className="material-symbols-outlined text-[15px] text-secondary">
              {moduleIcon(module.name)}
            </span>
            {moduleLabel(module.name)}
            <span className="text-outline">{module.count}</span>
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary">
            +{hiddenCount} modül
          </span>
        ) : null}
      </div>
      <p className="text-xs text-on-surface-variant">
        {codes.length} izin: {codes.slice(0, 3).map(permissionLabel).join(', ')}
        {codes.length > 3 ? ` ve ${codes.length - 3} izin daha` : ''}
      </p>
    </div>
  );
}

function permissionCodes(role: AdminRoleRow): string[] {
  return role.permissions
    .map((permission) => permission.permission.code)
    .sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));
}

function groupPermissionCodes(
  codes: string[],
): Array<{ name: string; count: number; actions: string[] }> {
  const groups = new Map<string, string[]>();

  for (const code of codes) {
    const moduleName = permissionModuleName(code);
    const action = permissionActionName(code);
    const actions = groups.get(moduleName) ?? [];
    actions.push(action);
    groups.set(moduleName, actions);
  }

  return [...groups.entries()]
    .map(([name, actions]) => ({
      name,
      count: actions.length,
      actions: actions
        .map(actionLabel)
        .sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
}

function roleLabel(roleName: string): string {
  return ROLE_LABELS[roleName] ?? roleName;
}

function moduleLabel(moduleName: string): string {
  return MODULE_LABELS[moduleName] ?? moduleName;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function permissionLabel(code: string): string {
  return `${moduleLabel(permissionModuleName(code))} - ${actionLabel(permissionActionName(code))}`;
}

function permissionModuleName(code: string): string {
  return code.split('.')[0] ?? code;
}

function permissionActionName(code: string): string {
  return code.split('.')[1] ?? '';
}

function roleIcon(roleName: string): string {
  const icons: Record<string, string> = {
    ADMIN: 'admin_panel_settings',
    ORDER_OPERATOR: 'support_agent',
    PRODUCT_MANAGER: 'inventory_2',
    COURIER: 'local_shipping',
    CUSTOMER: 'person',
  };

  return icons[roleName] ?? 'badge';
}

function moduleIcon(moduleName: string): string {
  const icons: Record<string, string> = {
    addresses: 'location_on',
    allergens: 'no_meals',
    audit: 'history',
    banners: 'view_carousel',
    campaigns: 'campaign',
    cart: 'shopping_cart',
    categories: 'category',
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

  return icons[moduleName] ?? 'tune';
}
