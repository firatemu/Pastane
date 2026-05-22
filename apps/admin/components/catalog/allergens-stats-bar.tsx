import type { JSX } from 'react';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';

interface AllergenResponse {
  id: string;
  name: string;
  productCount?: number | undefined;
}

export function AllergensStatsBar({ allergens }: Readonly<{ allergens: AllergenResponse[] }>): JSX.Element {
  const total = allergens.length;
  const inUse = allergens.filter((a) => (a.productCount ?? 0) > 0).length;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <BakeryStatCard size="minimal" label="Toplam alerjen" value={String(total)} iconGoogle="no_meals" accent="surface" />
      <BakeryStatCard size="minimal" label="Kullanımda" value={String(inUse)} iconGoogle="check_circle" accent="tertiary" />
      <BakeryStatCard size="minimal" label="Boşta" value={String(total - inUse)} iconGoogle="block" accent="secondary" />
      <BakeryStatCard size="minimal" label="Tanımlı" value={String(total)} iconGoogle="inventory_2" accent="surface" />
    </div>
  );
}