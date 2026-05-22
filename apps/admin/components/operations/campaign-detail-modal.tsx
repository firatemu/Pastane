'use client';

import { useEffect, type JSX } from 'react';
import type { CampaignRow } from '../../lib/operations/types';
import { can } from '../../lib/permissions/can';
import { adminSecondaryButtonClass } from '../shared/admin-form-controls';

export function CampaignDetailModal({
  campaign,
  permissions,
  onEdit,
  onClose,
}: Readonly<{
  campaign: CampaignRow | null;
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
}>): JSX.Element | null {
  useEffect(() => {
    if (!campaign) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [campaign, onClose]);

  if (!campaign) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Detayı kapat"
        className="fixed inset-0 z-[50] bg-chocolate/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[50] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-detail-title"
      >
        <div
          className="pointer-events-auto flex w-full max-w-xl max-h-[min(90vh,600px)] flex-col overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-surface-container-lowest">
            <p className="border-b border-outline-variant/25 bg-surface-container-low px-6 py-2 text-center text-xs font-medium text-on-surface-variant">
              İnceleme modu — değişiklik için Düzenle&apos;ye tıklayın
            </p>
            <header className="flex flex-col gap-4 border-b border-outline-variant/30 p-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="campaign-detail-title" className="font-display text-xl font-semibold tracking-tight text-on-surface">
                    {campaign.name}
                  </h2>
                  {campaign.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                      Pasif
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-chocolate">campaign</span>
                  Kampanya Tanımı
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {can(permissions, ['campaigns.update']) ? (
                  <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}>
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                    Düzenle
                  </button>
                ) : null}
                <button type="button" className={adminSecondaryButtonClass} onClick={onClose} aria-label="Detayı kapat">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <OverviewBlock title="Kampanya Adı" body={campaign.name} />
                <OverviewBlock
                  title="İndirim Türü"
                  body={campaign.type === 'PERCENT' ? 'Yüzde (%) İndirimi' : 'Sabit Tutar (TL) İndirimi'}
                />
                <OverviewBlock
                  title="İndirim Değeri"
                  body={campaign.type === 'PERCENT' ? `%${campaign.value}` : `${campaign.value} TL`}
                />
                <OverviewBlock
                  title="Durum"
                  body={campaign.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                />
                <div className="sm:col-span-2">
                  <OverviewBlock
                    title="Açıklama"
                    body={campaign.description}
                    empty="Açıklama belirtilmemiş."
                  />
                </div>
                <OverviewBlock
                  title="Başlangıç Tarihi"
                  body={new Date(campaign.startDate).toLocaleDateString('tr-TR')}
                />
                <OverviewBlock
                  title="Bitiş Tarihi"
                  body={campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('tr-TR') : 'Süresiz'}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function OverviewBlock({
  title,
  body,
  empty = 'Belirtilmemiş',
}: Readonly<{
  title: string;
  body: string | null | undefined;
  empty?: string;
}>): JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-on-surface font-medium">{body?.trim() ? body : empty}</p>
    </div>
  );
}
