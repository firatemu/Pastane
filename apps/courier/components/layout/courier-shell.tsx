import type { CourierSession } from '../../lib/auth/types';
import { CourierTopbar } from './courier-topbar';
import { MinimalNav } from './minimal-nav';

export function CourierShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: CourierSession;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-stone-100">
      <CourierTopbar session={session} />
      <MinimalNav />
      <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">{children}</main>
    </div>
  );
}
