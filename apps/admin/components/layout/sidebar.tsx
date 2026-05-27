'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can } from '../../lib/permissions/can';
import { getNavIcon, NAV_ITEMS, type AdminNavItem } from '../../lib/permissions/constants';
import { AdminBrand } from './admin-brand';

const GROUP_ICONS: Record<string, string> = {
  'Genel': 'dashboard',
  'Sipariş & Operasyon': 'local_shipping',
  'Katalog': 'bakery_dining',
  'İçerik & Kampanya': 'campaign',
  'Mağaza & Teslimat': 'storefront',
  'Müşteri & İletişim': 'group_add',
  'Analitik': 'bar_chart',
  'Sistem': 'settings',
};

const GROUP_COLORS: Record<string, string> = {
  'Genel': 'bg-blue-500',
  'Sipariş & Operasyon': 'bg-amber-500',
  'Katalog': 'bg-emerald-500',
  'İçerik & Kampanya': 'bg-purple-500',
  'Mağaza & Teslimat': 'bg-teal-500',
  'Müşteri & İletişim': 'bg-rose-500',
  'Analitik': 'bg-indigo-500',
  'Sistem': 'bg-stone-500',
};

type GroupedNav = {
  group: string;
  items: AdminNavItem[];
};

function groupNavItems(items: readonly AdminNavItem[]): GroupedNav[] {
  const groups = new Map<string, AdminNavItem[]>();
  for (const item of items) {
    const groupName = item.group ?? 'Diğer';
    const list = groups.get(groupName) ?? [];
    list.push(item);
    groups.set(groupName, list);
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }));
}

export function Sidebar({ permissions }: Readonly<{ permissions: string[] }>): JSX.Element {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const visibleItems = NAV_ITEMS.filter((item) => can(permissions, item.permissions));
  const grouped = groupNavItems(visibleItems).filter((g) => g.items.length > 0);

  function toggleGroup(group: string): void {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function isActive(href: string): boolean {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
  }

  // Aktif grubu bul
  const activeGroup = grouped.find((g) => g.items.some((item) => isActive(item.href)))?.group;

  // Aktif grubu otomatik aç
  useEffect(() => {
    if (activeGroup) {
      setExpandedGroups((prev) => {
        if (prev.has(activeGroup)) return prev;
        const next = new Set(prev);
        next.add(activeGroup);
        return next;
      });
    }
  }, [activeGroup]);

  return (
    <>
      {/* Mobil overlay */}
      {collapsed ? null : (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-outline-variant/60 bg-surface-container-lowest/95 backdrop-blur transition-all duration-300 ${
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64 translate-x-0'
        }`}
      >
        {/* Üst: Logo */}
        <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-4">
          {!collapsed ? (
            <Link href="/dashboard" className="min-w-0">
              <AdminBrand size="sm" subtitle="Yönetim Paneli" title="Pastane" tone="sidebar" />
            </Link>
          ) : (
            <Link href="/dashboard" className="mx-auto">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
                <span className="material-symbols-outlined text-[20px] text-white">bakery_dining</span>
              </div>
            </Link>
          )}
          {!collapsed ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              onClick={() => setCollapsed(true)}
              aria-label="Menüyü daralt"
            >
              <span className="material-symbols-outlined text-[20px]">menu_open</span>
            </button>
          ) : null}
        </div>

        {/* Daraltılmış modda expand butonu */}
        {collapsed ? (
          <button
            type="button"
            className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
            onClick={() => setCollapsed(false)}
            aria-label="Menüyü genişlet"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        ) : null}

        {/* Navigasyon */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {collapsed ? (
            /* Daraltılmış mod: sadece ikonlar */
            <div className="flex flex-col items-center gap-1">
              {grouped.flatMap((g) =>
                g.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                        active
                          ? 'bg-secondary-container text-secondary'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]" data-fill={active ? 'true' : undefined}>
                        {getNavIcon(item.href)}
                      </span>
                    </Link>
                  );
                }),
              )}
            </div>
          ) : (
            /* Geniş mod: gruplar */
            <div className="space-y-1">
              {grouped.map((g) => {
                const isExpanded = expandedGroups.has(g.group);
                const hasActive = g.group === activeGroup;
                const groupIcon = GROUP_ICONS[g.group] ?? 'folder';
                const groupColor = GROUP_COLORS[g.group] ?? 'bg-stone-400';

                return (
                  <div key={g.group} className="mb-1">
                    {/* Grup başlığı */}
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                        hasActive
                          ? 'bg-surface-container-highest/70'
                          : 'hover:bg-surface-container'
                      }`}
                      onClick={() => toggleGroup(g.group)}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${groupColor}`}>
                        <span className="material-symbols-outlined text-[14px] text-white">{groupIcon}</span>
                      </div>
                      <span className={`flex-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                        hasActive ? 'text-on-surface' : 'text-on-surface-variant'
                      }`}>
                        {g.group}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
                          {g.items.length}
                        </span>
                        <span
                          className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }}
                        >
                          expand_more
                        </span>
                      </div>
                    </button>

                    {/* Grup öğeleri */}
                    {isExpanded ? (
                      <div className="mt-0.5 ml-2 space-y-0.5 border-l-2 border-outline-variant/60 pl-3">
                        {g.items.map((item) => {
                          const active = isActive(item.href);
                          const iconName = getNavIcon(item.href);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition ${
                                active
                                  ? 'bg-secondary-container/70 font-semibold text-on-surface shadow-sm'
                                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:shadow-sm'
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                                  active
                                    ? 'bg-secondary-container text-secondary'
                                    : 'bg-surface-container text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]" data-fill={active ? 'true' : undefined}>
                                  {iconName}
                                </span>
                              </span>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {active ? (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Alt: Durum */}
        {!collapsed ? (
          <div className="border-t border-outline-variant/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container/80">
                <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-on-surface">Yönetim Paneli</p>
                <p className="truncate text-[10px] text-on-surface-variant">Pastane — Tek kiracı</p>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            </div>
          </div>
        ) : null}
      </aside>

      {/* Mobil toggle butonu */}
      <button
        type="button"
        className="fixed bottom-4 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg transition hover:bg-amber-700 lg:hidden"
        onClick={() => setCollapsed((v) => !v)}
        aria-label="Menü"
      >
        <span className="material-symbols-outlined text-[24px]">{collapsed ? 'menu' : 'close'}</span>
      </button>
    </>
  );
}