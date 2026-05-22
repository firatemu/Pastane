'use client';

import type { JSX, MouseEvent } from 'react';
import type { CampaignRow } from '../../lib/operations/types';

export function CampaignsList({
  campaigns,
  selectedId,
  onSelect,
  onEdit,
  onRemove,
  canEdit,
  canDelete,
}: Readonly<{
  campaigns: CampaignRow[];
  selectedId: string | null;
  onSelect: (campaign: CampaignRow) => void;
  onEdit: (campaign: CampaignRow) => void;
  onRemove: (campaign: CampaignRow) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}>): JSX.Element {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low px-8 py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
        <p className="mt-4 font-display text-lg font-semibold text-on-surface">Kampanya bulunamadı</p>
        <p className="mt-2 text-sm text-on-surface-variant">Arama kriterlerinizi değiştirin.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <div className="-mx-gutter overflow-x-auto px-gutter">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/35">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Kampanya Adı</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Tür</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İndirim Değeri</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Durum</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Zaman Aralığı</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-[15px]">
            {campaigns.map((campaign) => {
              const selected = selectedId === campaign.id;
              const hasEnd = Boolean(campaign.endDate);
              const dateText = `${new Date(campaign.startDate).toLocaleDateString('tr-TR')} - ${
                hasEnd ? new Date(campaign.endDate!).toLocaleDateString('tr-TR') : 'Süresiz'
              }`;

              return (
                <tr
                  key={campaign.id}
                  className={`group cursor-pointer transition ${selected ? 'bg-secondary-container/25' : 'hover:bg-surface-variant/35'}`}
                  onClick={() => onSelect(campaign)}
                >
                  <td className="py-3.5 px-4 font-semibold text-on-surface">
                    <div className="flex flex-col">
                      <span>{campaign.name}</span>
                      {campaign.description && (
                        <span className="text-xs font-medium text-on-surface-variant line-clamp-1 max-w-[250px]" title={campaign.description}>
                          {campaign.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {campaign.type === 'PERCENT' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-secondary">
                        <span className="material-symbols-outlined text-[14px]">percent</span>
                        Yüzde
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-chocolate/25 bg-chocolate/10 px-2.5 py-0.5 text-xs font-semibold text-chocolate">
                        <span className="material-symbols-outlined text-[14px]">payments</span>
                        Sabit
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-on-surface">
                    {campaign.type === 'PERCENT' ? `%${campaign.value}` : `${campaign.value} TL`}
                  </td>
                  <td className="py-3.5 px-4">
                    {campaign.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                      <span>{dateText}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      {canEdit && (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate transition shadow-sm hover:scale-105 active:scale-95"
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            onEdit(campaign);
                          }}
                          title="Düzenle"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {canDelete && campaign.status === 'ACTIVE' && (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-error/30 bg-error-container/20 text-error hover:bg-error hover:text-white transition shadow-sm hover:scale-105 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onRemove(campaign);
                          }}
                          title="Pasifleştir"
                        >
                          <span className="material-symbols-outlined text-[18px]">block</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
