'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import type { MediaAssetListResponse, MediaAssetRow } from '../../lib/catalog/types';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { ErrorState, LoadingState } from '../shared/async-state';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '../shared/admin-form-controls';

const PAGE_SIZE = 12;

export function ProductMediaGalleryDialog({
  open,
  productId,
  productName,
  defaultSortOrder,
  onClose,
  onAttached,
}: Readonly<{
  open: boolean;
  productId: string;
  productName: string;
  defaultSortOrder: number;
  onClose: () => void;
  onAttached: () => Promise<void>;
}>): JSX.Element | null {
  const [items, setItems] = useState<MediaAssetRow[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<MediaAssetListResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [sortOrder, setSortOrder] = useState(String(defaultSortOrder));
  const [primary, setPrimary] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const selectedAsset = useMemo(
    () => items.find((item) => item.id === selectedAssetId) ?? null,
    [items, selectedAssetId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setItems([]);
    setMeta(null);
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setSelectedAssetId(null);
    setAltText('');
    setSortOrder(String(defaultSortOrder));
    setPrimary(false);
    setListError(null);
    setAttachError(null);
  }, [defaultSortOrder, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [open, search]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPage(1);
  }, [debouncedSearch, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadAssets(): Promise<void> {
      try {
        setLoading(true);
        setListError(null);

        const query = new URLSearchParams({
          kind: 'IMAGE',
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) {
          query.set('search', debouncedSearch);
        }

        const response = await adminFetchEnvelope<MediaAssetRow[], MediaAssetListResponse['meta']>(
          `/media/assets?${query.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setItems(response.data ?? []);
        setMeta(response.meta ?? null);
      } catch (caught) {
        if (cancelled) {
          return;
        }

        setItems([]);
        setMeta(null);
        setSelectedAssetId(null);
        setListError(adminMessageFromUnknownError(caught, 'Galeri görselleri yüklenemedi.'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, open, page]);

  useEffect(() => {
    if (!open || items.length === 0) {
      return;
    }

    if (selectedAssetId && items.some((item) => item.id === selectedAssetId)) {
      return;
    }

    const fallback = items[0];
    if (!fallback) {
      return;
    }
    setSelectedAssetId(fallback.id);
    setAltText((current) => (current.trim().length > 0 ? current : fallback.title));
  }, [items, open, selectedAssetId]);

  if (!open) {
    return null;
  }

  async function attachSelectedAsset(): Promise<void> {
    if (!selectedAsset) {
      return;
    }

    const parsedSortOrder = Number(sortOrder);
    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      setAttachError('Sıra değeri 0 veya daha büyük bir tam sayı olmalı.');
      return;
    }

    try {
      setAttaching(true);
      setAttachError(null);
      await adminFetch(`/media/assets/${selectedAsset.id}/attach-product-image`, {
        method: 'POST',
        body: JSON.stringify({
          productId,
          altText: altText.trim() || undefined,
          sortOrder: parsedSortOrder,
          isPrimary: primary,
        }),
      });
      await onAttached();
      onClose();
    } catch (caught) {
      setAttachError(adminMessageFromUnknownError(caught, 'Seçilen görsel ürüne eklenemedi.'));
    } finally {
      setAttaching(false);
    }
  }

  function handleSelectAsset(asset: MediaAssetRow): void {
    setSelectedAssetId(asset.id);
    setAttachError(null);
    setAltText((current) => (current.trim().length > 0 ? current : asset.title));
  }

  return (
    <>
      <button
        type="button"
        aria-label="Galeri seçim penceresini kapat"
        className="fixed inset-0 z-[80] bg-chocolate/35 backdrop-blur-[2px]"
        onClick={onClose}
        disabled={attaching}
      />

      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <section
          className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-media-gallery-title"
        >
          <header className="flex items-start justify-between gap-4 border-b border-outline-variant/30 px-5 py-4">
            <div>
              <h2 id="product-media-gallery-title" className="font-display text-xl font-semibold text-on-surface">
                Galeriden ekle
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {productName} için mevcut görseller arasından seçip yeni yükleme yapmadan ürüne bağlayın.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container"
              onClick={onClose}
              disabled={attaching}
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="block flex-1 text-sm font-medium text-on-surface">
                  <span className="sr-only">Galeride ara</span>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                      search
                    </span>
                    <input
                      className={`${adminInputClass} pl-10`}
                      placeholder="Görsel adı veya dosya tipinde ara..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </label>
                <p className="text-xs font-medium text-on-surface-variant">
                  {meta ? `${meta.total} görsel` : 'Görseller hazırlanıyor'}
                </p>
              </div>

              {listError ? <ErrorState message={listError} /> : null}

              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-outline-variant/35 bg-surface-container-low p-3">
                {loading ? (
                  <LoadingState label="Galeri görselleri yükleniyor..." />
                ) : items.length === 0 ? (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-outline-variant/45 bg-surface-container-lowest px-4 text-center text-sm text-on-surface-variant">
                    Aramanıza uygun görsel bulunamadı.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((asset) => {
                      const selected = asset.id === selectedAssetId;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          className={
                            selected
                              ? 'overflow-hidden rounded-2xl border border-secondary bg-secondary-container/20 text-left shadow-sm transition'
                              : 'overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest text-left transition hover:border-secondary/35'
                          }
                          onClick={() => handleSelectAsset(asset)}
                        >
                          <img src={asset.url} alt={asset.title} className="aspect-[4/3] w-full object-cover" />
                          <div className="space-y-2 px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-surface-container px-2 py-1 text-[11px] font-semibold text-on-surface-variant">
                                {SOURCE_LABELS[asset.source]}
                              </span>
                              <span className="rounded-full bg-surface-container px-2 py-1 text-[11px] font-medium text-on-surface-variant">
                                {usageLabel(asset)}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm font-semibold text-on-surface">{asset.title}</p>
                            <p className="text-xs text-on-surface-variant">
                              {formatFileSize(asset.size)} · {formatDate(asset.createdAt)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {meta && meta.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
                  <p className="text-xs text-on-surface-variant">
                    Sayfa {meta.page} / {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={adminSecondaryButtonClass}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={loading || meta.page <= 1}
                    >
                      Önceki
                    </button>
                    <button
                      type="button"
                      className={adminSecondaryButtonClass}
                      onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                      disabled={loading || meta.page >= meta.totalPages}
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
              {selectedAsset ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest">
                    <img src={selectedAsset.url} alt={selectedAsset.title} className="aspect-square w-full object-cover" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-on-surface">{selectedAsset.title}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {selectedAsset.mimeType} · {formatFileSize(selectedAsset.size)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      className={adminInputClass}
                      placeholder="Alt metin (opsiyonel)"
                      value={altText}
                      onChange={(event) => setAltText(event.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={adminInputClass}
                      placeholder="Sıra"
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm text-on-surface">
                      <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} />
                      Birincil görsel olarak ayarla
                    </label>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-3 text-xs leading-5 text-on-surface-variant">
                    Seçilen medya yeniden yüklenmez; mevcut asset bu ürüne görsel olarak bağlanır.
                  </div>
                </>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-4 text-center text-sm text-on-surface-variant">
                  Devam etmek için galeriden bir görsel seçin.
                </div>
              )}

              {attachError ? <ErrorState message={attachError} /> : null}
            </aside>
          </div>

          <footer className="flex flex-col gap-3 border-t border-outline-variant/30 px-5 py-4 sm:flex-row">
            <button
              type="button"
              className={`${adminSecondaryButtonClass} flex-1`}
              onClick={onClose}
              disabled={attaching}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className={`${adminPrimaryButtonClass} flex-1`}
              onClick={() => void attachSelectedAsset()}
              disabled={!selectedAsset || attaching}
            >
              <span className={`material-symbols-outlined text-[18px] ${attaching ? 'animate-spin' : ''}`}>
                {attaching ? 'progress_activity' : 'photo_library'}
              </span>
              {attaching ? 'Ekleniyor...' : 'Seçili görseli ekle'}
            </button>
          </footer>
        </section>
      </div>
    </>
  );
}

const SOURCE_LABELS: Record<MediaAssetRow['source'], string> = {
  PRODUCT_UPLOAD: 'Ürün',
  BANNER_UPLOAD: 'Banner',
  GALLERY_UPLOAD: 'Galeri',
};

function usageLabel(asset: MediaAssetRow): string {
  if (!asset.usage.isUsed) {
    return 'Boş';
  }

  if (asset.usage.productImageCount > 0) {
    return `${asset.usage.productImageCount} ürün`;
  }

  return `${asset.usage.totalUsageCount} kullanım`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
