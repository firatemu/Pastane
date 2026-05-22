import type { JSX } from 'react';
import type { AdminBanner } from '../../lib/banners/schemas';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';

export function BannersStatsBar({ banners }: Readonly<{ banners: AdminBanner[] }>): JSX.Element {
  const total = banners.length;
  const activeCount = banners.filter((b) => b.isActive).length;
  const imageCount = banners.filter((b) => b.mediaType === 'IMAGE').length;
  const videoCount = banners.filter((b) => b.mediaType === 'VIDEO').length;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <BakeryStatCard
        size="minimal"
        label="Toplam Banner"
        value={String(total)}
        iconGoogle="view_carousel"
        accent="surface"
      />
      <BakeryStatCard
        size="minimal"
        label="Aktif Vitrin"
        value={String(activeCount)}
        iconGoogle="check_circle"
        accent="tertiary"
      />
      <BakeryStatCard
        size="minimal"
        label="Görsel Banner"
        value={String(imageCount)}
        iconGoogle="image"
        accent="secondary"
      />
      <BakeryStatCard
        size="minimal"
        label="Video Banner"
        value={String(videoCount)}
        iconGoogle="videocam"
        accent="alert"
      />
    </div>
  );
}
