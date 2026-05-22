'use client';

import { useEffect, useState, type JSX } from 'react';
import type { AdminBanner } from '../../lib/banners/schemas';
import { formatSchedule } from '../../lib/banners/schemas';
import { can } from '../../lib/permissions/can';
import { adminSecondaryButtonClass } from '../shared/admin-form-controls';

export function BannerDetailModal({
  banner,
  permissions,
  onEdit,
  onClose,
}: Readonly<{
  banner: AdminBanner | null;
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
}>): JSX.Element | null {
  useEffect(() => {
    if (!banner) return;
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
  }, [banner, onClose]);

  if (!banner) return null;

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
        aria-labelledby="banner-detail-title"
      >
        <div
          className="pointer-events-auto flex w-full max-w-3xl max-h-[min(90vh,800px)] flex-col overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <BannerDetailTabs
            key={banner.id}
            banner={banner}
            permissions={permissions}
            onEdit={onEdit}
            onClose={onClose}
            readOnly
          />
        </div>
      </div>
    </>
  );
}

type TabId = 'overview' | 'desktop' | 'mobile';

export function BannerDetailTabs({
  banner,
  permissions,
  onEdit,
  onClose,
  readOnly = false,
}: Readonly<{
  banner: AdminBanner;
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
  readOnly?: boolean;
}>): JSX.Element {
  const [tab, setTab] = useState<TabId>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Özet', icon: 'info' },
    { id: 'desktop' as const, label: 'Masaüstü (16:9)', icon: 'desktop_windows' },
    { id: 'mobile' as const, label: 'Mobil (9:16)', icon: 'phone_iphone' },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-surface-container-lowest">
      {readOnly ? (
        <p className="border-b border-outline-variant/25 bg-surface-container-low px-6 py-2 text-center text-xs font-medium text-on-surface-variant">
          İnceleme modu — değişiklik için Düzenle&apos;ye tıklayın
        </p>
      ) : null}
      <header className="flex flex-col gap-4 border-b border-outline-variant/30 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          {banner.mediaType === 'IMAGE' ? (
            <div className="flex h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-sm">
              <img alt="" className="h-full w-full object-cover" src={banner.desktopMediaUrl} />
            </div>
          ) : (
            <div className="flex h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-sm relative">
              <video className="h-full w-full object-cover" src={banner.desktopMediaUrl} muted playsInline />
              <span className="material-symbols-outlined absolute inset-0 m-auto h-fit w-fit text-white bg-black/50 rounded-full p-1 text-[16px]">
                play_arrow
              </span>
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="banner-detail-title" className="font-display text-xl font-semibold tracking-tight text-on-surface">
                {banner.title}
              </h2>
              {banner.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary whitespace-nowrap">
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                  Pasif
                </span>
              )}
            </div>
            {banner.subtitle && <p className="mt-1 text-sm text-on-surface-variant">{banner.subtitle}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {formatSchedule(banner)}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">sort</span>
                Sıra: {banner.sortOrder}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {can(permissions, ['banners.update']) ? (
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

      <nav className="flex gap-1 overflow-x-auto border-b border-outline-variant/25 px-4" aria-label="Banner sekmeleri">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={
                active
                  ? 'flex items-center gap-2 border-b-2 border-secondary px-4 py-3 text-sm font-semibold text-secondary'
                  : 'flex items-center gap-2 px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:text-on-surface'
              }
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'overview' ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <OverviewBlock title="Banner Başlığı" body={banner.title} />
            <OverviewBlock title="Alt Başlık" body={banner.subtitle} empty="Alt başlık tanımlanmamış." />
            <div className="sm:col-span-2">
              <OverviewBlock title="Açıklama" body={banner.description} empty="Açıklama girilmemiş." />
            </div>
            <OverviewBlock title="Medya Türü" body={banner.mediaType === 'IMAGE' ? '🖼️ Görsel' : '🎥 Video'} />
            <OverviewBlock title="Sıra / Öncelik" body={String(banner.sortOrder)} />
            <OverviewBlock title="Buton Metni" body={banner.buttonText} empty="Buton metni belirtilmemiş." />
            <OverviewBlock title="Buton Bağlantısı (URL)" body={banner.buttonUrl} empty="Buton linki belirtilmemiş." />
            <OverviewBlock title="Zamanlanmış Başlangıç" body={banner.startsAt ? new Date(banner.startsAt).toLocaleString('tr-TR') : 'Hemen'} />
            <OverviewBlock title="Zamanlanmış Bitiş" body={banner.endsAt ? new Date(banner.endsAt).toLocaleString('tr-TR') : 'Süresiz'} />
          </div>
        ) : null}

        {tab === 'desktop' ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative aspect-[16/9] w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-bakery">
              {banner.mediaType === 'IMAGE' ? (
                <img alt="Desktop Banner Preview" className="h-full w-full object-cover" src={banner.desktopMediaUrl} />
              ) : (
                <video className="h-full w-full object-cover" controls src={banner.desktopMediaUrl} />
              )}
            </div>
            <p className="text-xs text-outline">Geniş ekran masaüstü (16:9) önizleme. Gerçek çözünürlük orijinal yüklere bağlıdır.</p>
          </div>
        ) : null}

        {tab === 'mobile' ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative aspect-[9/16] h-[400px] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-bakery">
              {banner.mediaType === 'IMAGE' ? (
                <img alt="Mobile Banner Preview" className="h-full w-full object-cover" src={banner.mobileMediaUrl} />
              ) : (
                <video className="h-full w-full object-cover" controls src={banner.mobileMediaUrl} />
              )}
            </div>
            <p className="text-xs text-outline">Dikey mobil ekran (9:16) önizleme.</p>
          </div>
        ) : null}
      </div>
    </section>
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
