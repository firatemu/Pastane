import type { JSX, ReactNode } from 'react';
import type { AdminSession } from '../../lib/auth/types';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AdminShell({
  children,
  session,
}: Readonly<{ children: ReactNode; session: AdminSession }>): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar permissions={session.permissions} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar session={session} />
        <main className="w-full flex-1 px-6 py-stack-lg lg:min-h-[calc(100vh-4.25rem)] lg:px-8 lg:py-stack-lg">
          {children}
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest px-6 py-stack-md lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">© Pasta-Hane • operasyon</p>
          <div className="flex gap-gutter text-xs text-on-surface-variant">
            <span className="opacity-80">Çok kiracılı değildir • tek işletme</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
