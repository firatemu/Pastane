'use client';

import type { JSX, MouseEvent } from 'react';
import type { AdminBanner } from '../../lib/banners/schemas';
import { formatSchedule } from '../../lib/banners/schemas';

export function BannersList({
  banners,
  selectedId,
  onSelect,
  onEdit,
  onToggleActive,
  onRemove,
  onMove,
  canEdit,
  canDelete,
  canReorder,
}: Readonly<{
  banners: AdminBanner[];
  selectedId: string | null;
  onSelect: (banner: AdminBanner) => void;
  onEdit: (banner: AdminBanner) => void;
  onToggleActive: (banner: AdminBanner) => Promise<void>;
  onRemove: (banner: AdminBanner) => Promise<void>;
  onMove: (from: number, to: number) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
  canReorder: boolean;
}>): JSX.Element {
  if (banners.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low px-8 py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
        <p className="mt-4 font-display text-lg font-semibold text-on-surface">Banner bulunamadı</p>
        <p className="mt-2 text-sm text-on-surface-variant">Arama kriterlerinizi değiştirin.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <div className="-mx-gutter overflow-x-auto px-gutter">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/35">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Önizleme</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Medya Tipi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Başlık / Açıklama</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Aktiflik</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Zamanlama</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Sıra</th>
              {canReorder && (
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Sıralama</th>
              )}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-[15px]">
            {banners.map((banner, index) => {
              const selected = selectedId === banner.id;

              return (
                <tr
                  key={banner.id}
                  className={`group cursor-pointer transition ${selected ? 'bg-secondary-container/25' : 'hover:bg-surface-variant/35'}`}
                  onClick={() => onSelect(banner)}
                >
                  <td className="py-3 px-4">
                    {banner.mediaType === 'IMAGE' ? (
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-outline-variant/35 bg-surface-container shadow-bakery">
                        <img
                          alt={banner.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          src={banner.desktopMediaUrl}
                        />
                      </div>
                    ) : (
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-outline-variant/35 bg-surface-container shadow-bakery">
                        <video
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          muted
                          playsInline
                          src={banner.desktopMediaUrl}
                        />
                        <span className="material-symbols-outlined absolute right-1.5 bottom-1.5 text-[14px] bg-black/60 text-white rounded-full p-0.5 pointer-events-none">
                          play_arrow
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {banner.mediaType === 'IMAGE' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-secondary">
                        <span className="material-symbols-outlined text-[14px]">image</span>
                        Görsel
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-chocolate/25 bg-chocolate/10 px-2.5 py-0.5 text-xs font-semibold text-chocolate">
                        <span className="material-symbols-outlined text-[14px]">videocam</span>
                        Video
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface max-w-[200px] truncate" title={banner.title}>
                        {banner.title}
                      </span>
                      {banner.subtitle && (
                        <span className="text-xs text-on-surface-variant max-w-[200px] truncate" title={banner.subtitle}>
                          {banner.subtitle}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {banner.isActive ? (
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
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                      <span>{formatSchedule(banner)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-secondary">
                      {banner.sortOrder}
                    </span>
                  </td>
                  {canReorder && (
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate disabled:opacity-30 disabled:pointer-events-none transition shadow-sm hover:scale-105 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onMove(index, index - 1);
                          }}
                          title="Yukarı taşı"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          disabled={index === banners.length - 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate disabled:opacity-30 disabled:pointer-events-none transition shadow-sm hover:scale-105 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onMove(index, index + 1);
                          }}
                          title="Aşağı taşı"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate transition shadow-sm hover:scale-105 active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onToggleActive(banner);
                            }}
                            title={banner.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {banner.isActive ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-chocolate transition shadow-sm hover:scale-105 active:scale-95"
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation();
                              onEdit(banner);
                            }}
                            title="Düzenle"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-error/30 bg-error-container/20 text-error hover:bg-error hover:text-white transition shadow-sm hover:scale-105 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onRemove(banner);
                          }}
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
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
