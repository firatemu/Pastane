'use client';

import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminSession } from '../../lib/auth/types';
import { can } from '../../lib/permissions/can';
import { getNavIcon, NAV_ITEMS } from '../../lib/permissions/constants';
import { LogoutButton } from '../auth/logout-button';

const MAX_SEARCH_RESULTS = 6;

export function Topbar({ session }: Readonly<{ session: AdminSession }>): JSX.Element {
  // Avoid hydration mismatches: Date.now() differs between SSR and client.
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return undefined;

    function handlePointerDown(event: MouseEvent): void {
      if (searchRef.current?.contains(event.target as Node)) return;
      setIsSearchOpen(false);
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsSearchOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOpen]);

  const dateLabel = useMemo(() => {
    if (!now) return '';
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now);
  }, [now]);

  const initials = `${session.user.firstName.at(0) ?? ''}${session.user.lastName.at(0) ?? ''}`.trim() || 'PH';
  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.enabled && can(session.permissions, item.permissions)),
    [session.permissions],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase('tr');

  const searchResults = useMemo(() => {
    if (normalizedSearch.length === 0) {
      return visibleItems.slice(0, MAX_SEARCH_RESULTS);
    }

    return visibleItems
      .map((item, index) => {
        const label = item.label.toLocaleLowerCase('tr');
        const group = (item.group ?? '').toLocaleLowerCase('tr');
        const href = item.href.toLocaleLowerCase('tr');
        let score = 0;

        if (label.startsWith(normalizedSearch)) score += 120;
        if (label.includes(normalizedSearch)) score += 90;
        if (group.includes(normalizedSearch)) score += 35;
        if (href.includes(normalizedSearch)) score += 25;
        if (score === 0) return null;

        return {
          item,
          score: score + Math.max(0, visibleItems.length - index),
        };
      })
      .filter((entry): entry is { item: (typeof visibleItems)[number]; score: number } => entry !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_SEARCH_RESULTS)
      .map((entry) => entry.item);
  }, [normalizedSearch, visibleItems]);

  function handleNavigate(href: string): void {
    setIsSearchOpen(false);
    setSearch('');

    if (href !== pathname) {
      router.push(href);
    }
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    const firstResult = searchResults[0];

    if (event.key === 'Enter' && firstResult) {
      event.preventDefault();
      handleNavigate(firstResult.href);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchOpen(false);
      event.currentTarget.blur();
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/70 bg-surface-container-lowest/90 backdrop-blur">
      <div className="mx-auto flex min-h-[4rem] w-full max-w-[1360px] items-center justify-between gap-3 px-4 py-2.5 sm:px-5 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-2 xl:flex-row xl:items-center">
          <div className="hidden min-w-fit xl:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Operasyon paneli</p>
            <span className="mt-1 block text-sm font-semibold tracking-tight text-on-surface">Kompakt kontrol görünümü</span>
          </div>
          <div className="relative w-full max-w-xl flex-1" ref={searchRef}>
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              aria-controls="admin-topbar-search-results"
              aria-expanded={isSearchOpen}
              aria-label="Hızlı sayfa araması"
              className="w-full rounded-xl border border-outline-variant/80 bg-surface px-10 py-2.5 pr-24 text-sm text-on-surface outline-none shadow-sm transition placeholder:text-outline focus-visible:border-secondary/45 focus-visible:ring-4 focus-visible:ring-secondary-container/70"
              onChange={(event) => {
                setSearch(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Menü veya sayfa ara"
              type="search"
              value={search}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-full border border-outline-variant/60 bg-surface-container-low px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant sm:inline">
              {normalizedSearch.length > 0 ? `${searchResults.length} sonuç` : 'Hızlı geçiş'}
            </span>
            {isSearchOpen ? (
              <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-lowest shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                <div className="border-b border-outline-variant/50 px-4 py-2 text-[11px] font-medium text-on-surface-variant">
                  {normalizedSearch.length > 0
                    ? 'Erişiminiz olan yönetim sayfalarında arayın. Enter ilk sonucu açar.'
                    : 'Hızlı geçiş için bir sayfa seçin veya aramaya başlayın.'}
                </div>
                {searchResults.length > 0 ? (
                  <ul className="max-h-80 overflow-y-auto p-2" id="admin-topbar-search-results" role="listbox">
                    {searchResults.map((item) => {
                      const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                      return (
                        <li key={item.href}>
                          <button
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                              active
                                ? 'bg-secondary-container/80 text-secondary'
                                : 'text-on-surface hover:bg-surface-container-low hover:text-on-surface'
                            }`}
                            onClick={() => handleNavigate(item.href)}
                            onMouseDown={(event) => event.preventDefault()}
                            type="button"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                active ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">{getNavIcon(item.href)}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{item.label}</span>
                              <span className="block truncate text-[11px] text-on-surface-variant">
                                {item.group ? `${item.group} • ` : ''}
                                {item.href}
                              </span>
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                active
                                  ? 'border-secondary/20 bg-secondary/10 text-secondary'
                                  : 'border-outline-variant/60 bg-surface text-on-surface-variant'
                              }`}
                            >
                              {active ? 'Açık' : 'Git'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-4 py-5 text-sm text-on-surface-variant">
                    "{search}" ile eşleşen erişilebilir bir yönetim sayfası bulunamadı.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <time
            className="hidden rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface-variant xl:inline"
            dateTime={now ? now.toISOString() : undefined}
            suppressHydrationWarning
          >
            {dateLabel}
          </time>
          <button
            className="relative rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-2 text-on-surface-variant shadow-sm transition hover:text-primary disabled:opacity-45"
            disabled
            title="Yakında"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-error" />
          </button>
          <Link
            aria-label="Ayarlar"
            className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-2 text-on-surface-variant shadow-sm transition hover:text-primary"
            href="/settings"
            prefetch={false}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-3 py-1.5 shadow-sm md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-on-secondary">{initials}</div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-on-surface">
                {session.user.firstName} {session.user.lastName}
              </p>
              <p className="truncate text-[11px] text-on-surface-variant">{session.user.role.name}</p>
            </div>
          </div>
          <LogoutButton variant="subtle" className="hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}
