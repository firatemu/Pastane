import type { AdminSession } from '../../lib/auth/types';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AdminShell({ children, session }: Readonly<{ children: React.ReactNode; session: AdminSession }>): React.JSX.Element {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <Sidebar permissions={session.permissions} />
      <div className="min-w-0">
        <Topbar session={session} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
