import type { JSX } from 'react';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';

export function CategoriesStatsBar({
  total,
  active,
  roots,
  withChildren,
}: Readonly<{ total: number; active: number; roots: number; withChildren: number }>): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <BakeryStatCard size="minimal" label="Toplam kategori" value={String(total)} iconGoogle="category" accent="surface" />
      <BakeryStatCard size="minimal" label="Aktif" value={String(active)} iconGoogle="check_circle" accent="tertiary" />
      <BakeryStatCard size="minimal" label="Üst seviye" value={String(roots)} iconGoogle="account_tree" accent="secondary" />
      <BakeryStatCard size="minimal" label="Alt kategorili" value={String(withChildren)} iconGoogle="subdirectory_arrow_right" accent="surface" />
    </div>
  );
}