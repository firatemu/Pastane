import type { JSX } from 'react';

export function CategoryStatusPill({ isActive }: Readonly<{ isActive: boolean }>): JSX.Element {
  const cls = isActive
    ? 'border border-tertiary/25 bg-tertiary-container text-tertiary'
    : 'border border-outline-variant/50 bg-surface-variant text-on-surface-variant';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {isActive ? 'Aktif' : 'Pasif'}
    </span>
  );
}
