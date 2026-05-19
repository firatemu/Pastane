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
    <section className="mt-10 grid gap-5 lg:grid-cols-3">
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Kampanyalar</p>
        <h2 className="mt-2 text-xl font-semibold">Aktif fırsatlar</h2>
        <div className="mt-4 space-y-3">
          {campaigns.length ? campaigns.slice(0, 3).map((campaign) => (
            <article className="rounded-2xl bg-amber-50 px-4 py-3" key={campaign.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-stone-950">{campaign.name}</p>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">{campaignLabel(campaign)}</span>
              </div>
              {campaign.description ? <p className="mt-2 text-sm leading-5 text-stone-600">{campaign.description}</p> : null}
            </article>
          )) : <p className="text-sm text-stone-600">Şu anda aktif kampanya bulunmuyor.</p>}
        </div>
      </div>

      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Mağazalar</p>
        <h2 className="mt-2 text-xl font-semibold">Teslimat ve teslim alma</h2>
        <div className="mt-4 space-y-3">
          {stores.length ? stores.slice(0, 3).map((store) => (
            <article className="rounded-2xl border border-stone-100 px-4 py-3" key={store.id}>
              <p className="font-medium text-stone-950">{store.name}</p>
              <p className="mt-1 text-sm text-stone-600">{store.district} / {store.city}</p>
              <p className="mt-1 line-clamp-2 text-sm text-stone-500">{store.address}</p>
              {store.phone ? <p className="mt-2 text-sm text-amber-800">{store.phone}</p> : null}
            </article>
          )) : <p className="text-sm text-stone-600">Aktif mağaza bilgisi henüz yayınlanmadı.</p>}
        </div>
      </div>

      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Teslimat bölgeleri</p>
        <h2 className="mt-2 text-xl font-semibold">Servis bilgisi</h2>
        <div className="mt-4 space-y-3">
          {deliveryZones.length ? deliveryZones.slice(0, 3).map((zone) => (
            <article className="rounded-2xl border border-stone-100 px-4 py-3" key={zone.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-stone-950">{zone.name}</p>
                <span className="shrink-0 text-sm font-semibold text-stone-900">{formatTry(zone.deliveryFee)}</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">{zone.estimatedMinutes ? `Tahmini ${zone.estimatedMinutes} dk` : 'Tahmini süre siparişte netleşir.'}</p>
              {zone.minimumOrderPrice ? <p className="mt-1 text-xs text-stone-500">Minimum sepet: {formatTry(zone.minimumOrderPrice)}</p> : null}
            </article>
          )) : <p className="text-sm text-stone-600">Teslimat bölgesi bilgisi henüz yayınlanmadı.</p>}
        </div>
      </div>
    </section>
  );
}