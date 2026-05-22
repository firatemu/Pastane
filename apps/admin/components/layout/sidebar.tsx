'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '../auth/logout-button';
import { can } from '../../lib/permissions/can';
import { NAV_ITEMS } from '../../lib/permissions/constants';

function navIcon(href: string): string {
  const icons: Record<string, string> = {
    '/dashboard': 'analytics',
    '/products': 'bakery_dining',
    '/categories': 'category',
    '/allergens': 'no_meals',
    '/banners': 'image',
    '/campaigns': 'campaign',
    '/loyalty': 'card_membership',
    '/stores': 'storefront',
    '/delivery-zones': 'map',
    '/settings': 'settings',
    '/notifications': 'notifications_active',
    '/audit': 'history',
    '/users': 'group',
    '/roles': 'admin_panel_settings',
    '/permissions': 'lock_person',
    '/orders': 'shopping_bag',
    '/courier-assignment': 'local_shipping',
    '/couriers': 'electric_bike',
    '/reviews': 'star_rate',
    '/reports': 'bar_chart',
  };
  return icons[href] ?? 'fiber_manual_record';
}

export function Sidebar({ permissions }: Readonly<{ permissions: string[] }>): JSX.Element {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => can(permissions, item.permissions));
  const canOpenProducts = can(permissions, ['products.view']);

  return (
    <aside className="sticky top-0 z-40 flex flex-col border-b border-outline-variant bg-surface-container-low lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:shadow-none">
      <div className="px-gutter pb-2 pt-4 lg:pb-3">
        <p className="font-display text-xl font-semibold tracking-tight text-secondary">Pastane Yönetim</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">Gösterge paneli &amp; operasyon</p>
      </div>
      {canOpenProducts ? (
        <div className="border-t border-outline-variant/30 px-4 pb-2 lg:border-t-0">
          <Link
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-sm font-semibold text-on-secondary shadow-bakery transition hover:scale-[1.02] active:scale-[0.98]"
            href="/products"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Ürünlere git
          </Link>
        </div>
      ) : null}
      <nav className="mb-2 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 lg:max-h-[calc(100vh-200px)]">
        {visibleItems.map((item, idx) => {
          const prev = idx > 0 ? visibleItems[idx - 1] : undefined;
          const showGroupHeading = Boolean(item.group && item.group !== prev?.group);
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          const iconName = navIcon(item.href);
          return (
            <div key={item.href}>
              {showGroupHeading ? (
                <p className="mb-1 mt-2.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-outline first:mt-0 lg:first:mt-1">{item.group}</p>
              ) : null}
              {!item.enabled ? (
                <span className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-outline">
                  <span className="material-symbols-outlined">{iconName}</span>
                  {item.label}
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">yakında</span>
                </span>
              ) : active ? (
                <Link className={activeNavClass()} href={item.href}>
                  <span className="material-symbols-outlined text-[22px]" data-fill="true">
                    {iconName}
                  </span>
                  <span className="text-[15px] font-bold">{item.label}</span>
                </Link>
              ) : (
                <Link className={idleNavClass()} href={item.href}>
                  <span className="material-symbols-outlined text-[22px]">{iconName}</span>
                  <span className="text-[15px] font-semibold">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant/30 px-2 pb-3 pt-2">
        <LogoutButton variant="danger" className="w-full justify-center">
          <>
            <span className="material-symbols-outlined text-[22px]">logout</span>
            Çıkış
          </>
        </LogoutButton>
      </div>
    </aside>
  );
}

function activeNavClass(): string {
  return 'flex items-center gap-3 rounded-lg bg-secondary-container px-3 py-2 text-secondary shadow-sm transition hover:translate-x-0.5 active:scale-[0.98]';
}

function idleNavClass(): string {
  return 'flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition hover:bg-surface-variant/60 hover:text-on-surface active:scale-[0.98]';
}
