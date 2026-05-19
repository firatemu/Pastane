import Link from 'next/link';
import { NAV_ITEMS } from '../../lib/permissions/constants';
import { can } from '../../lib/permissions/can';

export function Sidebar({ permissions }: Readonly<{ permissions: string[] }>): React.JSX.Element {
  const visibleItems = NAV_ITEMS.filter((item) => can(permissions, item.permissions));
  return (
    <aside className="border-b bg-white p-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-6">
      <div className="rounded-2xl bg-stone-900 px-4 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-300">Pastane</p>
        <p className="mt-2 text-xl font-semibold">Admin Paneli</p>
      </div>
      <nav className="mt-6 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
        {visibleItems.map((item, idx) => {
          const prev = idx > 0 ? visibleItems[idx - 1] : undefined;
          const showGroupHeading = Boolean(item.group && item.group !== prev?.group);
          return (
            <div key={item.href}>
              {showGroupHeading ? (
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 first:mt-0 lg:mt-0">{item.group}</p>
              ) : null}
              {item.enabled ? (
                <Link className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-amber-50 hover:text-stone-950" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-stone-400">
                  {item.label}
                  <span className="text-[10px] uppercase tracking-[0.2em]">Yakında</span>
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
