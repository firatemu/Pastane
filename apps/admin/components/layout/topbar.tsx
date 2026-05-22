'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import Link from 'next/link';
import type { AdminSession } from '../../lib/auth/types';
import { LogoutButton } from '../auth/logout-button';

export function Topbar({ session }: Readonly<{ session: AdminSession }>): JSX.Element {
  // Avoid hydration mismatches: Date.now() differs between SSR and client.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

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

  return (
    <header className="sticky top-0 z-30 mx-auto flex min-h-[4rem] w-full items-center justify-between gap-4 border-b border-outline-variant bg-surface px-4 py-2 shadow-bakery sm:px-6 lg:min-h-0 lg:h-[4.25rem] lg:px-margin-desktop">
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
        <span className="hidden font-display text-xl font-semibold tracking-tight text-primary lg:mr-8 lg:block">Pasta-Hane</span>
        <div className="relative w-full max-w-md flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary">search</span>
          <input
            aria-label="Arama (yakında)"
            className="w-full rounded-full border-none bg-surface-container-lowest py-2 pl-10 pr-4 text-[15px] text-on-surface outline-none placeholder:text-outline shadow-bakery transition focus-visible:ring-2 focus-visible:ring-tertiary disabled:opacity-90"
            placeholder="Sipariş veya ürün ara..."
            disabled
            type="search"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-[11px] text-on-surface-variant sm:inline">yakında</span>
        </div>
        <time
          className="hidden text-[13px] text-on-surface-variant lg:inline"
          dateTime={now ? now.toISOString() : undefined}
          suppressHydrationWarning
        >
          {dateLabel}
        </time>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">Operatör</p>
          <p className="text-sm font-semibold text-on-surface">
            {session.user.firstName} {session.user.lastName}
          </p>
        </div>
        <button className="relative rounded-xl p-2 text-on-surface-variant transition hover:text-primary disabled:opacity-45" disabled title="Yakında" type="button">
          <span className="material-symbols-outlined text-[26px]">notifications</span>
          <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
        </button>
        <Link aria-label="Ayarlar" className="rounded-xl p-2 text-on-surface-variant transition hover:text-primary" href="/settings" prefetch={false}>
          <span className="material-symbols-outlined text-[26px]">settings</span>
        </Link>
        <span className="hidden max-w-[140px] truncate rounded-full border border-outline-variant/40 bg-secondary-container px-2 py-1 text-xs font-semibold text-secondary xl:inline">{session.user.role.name}</span>
        <LogoutButton variant="subtle" className="hidden sm:inline-flex" />
      </div>
    </header>
  );
}
