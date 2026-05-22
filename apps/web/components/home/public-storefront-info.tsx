import type { Campaign, DeliveryZone, Store } from '../../lib/catalog/types';
import { formatTry } from '../shared/price';

function campaignLabel(campaign: Campaign): string {
  const value = Number(campaign.value);
  if (campaign.type.toUpperCase().includes('PERCENT')) return `%${value} avantaj`;
  return `${formatTry(campaign.value)} avantaj`;
}

export function PublicStorefrontInfo({ campaigns, stores, deliveryZones }: Readonly<{ campaigns: Campaign[]; stores: Store[]; deliveryZones: DeliveryZone[] }>): React.JSX.Element | null {
  if (!campaigns.length && !stores.length && !deliveryZones.length) return null;
  return (
    <section className="grid gap-5 py-16 lg:grid-cols-3">
      <div className="stitch-panel rounded-3xl p-6">
        <p className="stitch-eyebrow">Kampanyalar</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-primary">Aktif fırsatlar</h2>
        <div className="mt-4 space-y-3">
          {campaigns.length ? campaigns.slice(0, 3).map((campaign) => (
            <article className="rounded-2xl bg-surface-low px-4 py-3" key={campaign.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink">{campaign.name}</p>
                <span className="shrink-0 rounded-full bg-honey px-3 py-1 text-xs font-bold text-primary">{campaignLabel(campaign)}</span>
              </div>
              {campaign.description ? <p className="mt-2 text-sm leading-5 text-muted">{campaign.description}</p> : null}
            </article>
          )) : <p className="text-sm text-muted">Şu anda aktif kampanya bulunmuyor.</p>}
        </div>
      </div>

      <div className="stitch-panel rounded-3xl p-6">
        <p className="stitch-eyebrow">Mağazalar</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-primary">Teslimat ve teslim alma</h2>
        <div className="mt-4 space-y-3">
          {stores.length ? stores.slice(0, 3).map((store) => (
            <article className="rounded-2xl border border-outline-soft/40 px-4 py-3" key={store.id}>
              <p className="font-medium text-ink">{store.name}</p>
              <p className="mt-1 text-sm text-muted">{store.district} / {store.city}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted/80">{store.address}</p>
              {store.phone ? <p className="mt-2 text-sm text-secondary">{store.phone}</p> : null}
            </article>
          )) : <p className="text-sm text-muted">Aktif mağaza bilgisi henüz yayınlanmadı.</p>}
        </div>
      </div>

      <div className="stitch-panel rounded-3xl p-6">
        <p className="stitch-eyebrow">Teslimat bölgeleri</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-primary">Servis bilgisi</h2>
        <div className="mt-4 space-y-3">
          {deliveryZones.length ? deliveryZones.slice(0, 3).map((zone) => (
            <article className="rounded-2xl border border-outline-soft/40 px-4 py-3" key={zone.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink">{zone.name}</p>
                <span className="shrink-0 text-sm font-semibold text-primary">{formatTry(zone.deliveryFee)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{zone.estimatedMinutes ? `Tahmini ${zone.estimatedMinutes} dk` : 'Tahmini süre siparişte netleşir.'}</p>
              {zone.minimumOrderPrice ? <p className="mt-1 text-xs text-muted/80">Minimum sepet: {formatTry(zone.minimumOrderPrice)}</p> : null}
            </article>
          )) : <p className="text-sm text-muted">Teslimat bölgesi bilgisi henüz yayınlanmadı.</p>}
        </div>
      </div>
    </section>
  );
}
