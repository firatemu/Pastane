import type { JSX } from 'react';
import type { CampaignRow } from '../../lib/operations/types';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';

export function CampaignsStatsBar({ campaigns }: Readonly<{ campaigns: CampaignRow[] }>): JSX.Element {
  const total = campaigns.length;
  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const percentCount = campaigns.filter((c) => c.type === 'PERCENT').length;
  const fixedCount = campaigns.filter((c) => c.type === 'FIXED').length;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <BakeryStatCard
        size="minimal"
        label="Toplam Kampanya"
        value={String(total)}
        iconGoogle="campaign"
        accent="surface"
      />
      <BakeryStatCard
        size="minimal"
        label="Aktif Kampanya"
        value={String(activeCount)}
        iconGoogle="check_circle"
        accent="tertiary"
      />
      <BakeryStatCard
        size="minimal"
        label="Yüzde İndirimi"
        value={String(percentCount)}
        iconGoogle="percent"
        accent="secondary"
      />
      <BakeryStatCard
        size="minimal"
        label="Sabit İndirim"
        value={String(fixedCount)}
        iconGoogle="payments"
        accent="alert"
      />
    </div>
  );
}
