import type { JSX, ReactNode } from 'react';
import type { AdminSession } from '../../lib/auth/types';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AdminShell({
  children,
  session,
}: Readonly<{ children: ReactNode; session: AdminSession }>): JSX.Element {
  return (
    <div className="relative min-h-screen bg-canvas text-on-canvas">
      <Sidebar permissions={session.permissions} />
      <div className="relative flex min-h-screen flex-col lg:pl-64">
        <Topbar session={session} />
        <main className="w-full flex-1 px-4 py-4 sm:px-5 lg:min-h-[calc(100vh-4rem)] lg:px-8 lg:py-6">
          <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-5">{children}</div>
        </main>
        <footer className="border-t border-outline-variant/60 bg-surface/85 px-4 py-3 backdrop-blur sm:px-5 lg:px-8">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">© Pasta-Hane • operasyon konsolu</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
              <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-2.5 py-1">Tek işletme</span>
              <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-2.5 py-1">Yönetim ekranı</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
