'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import {
  buildMediaDeleteSuccessMessage,
  formatMediaKind,
  formatMediaShortDate,
  formatMediaSource,
  formatMediaUsage,
  formatMediaUsageBadge,
  MEDIA_KIND_OPTIONS,
  MEDIA_SOURCE_OPTIONS,
  MEDIA_USAGE_OPTIONS,
} from '../../lib/media/presentation';
import type {
  MediaAssetDeleteResponse,
  MediaAssetDetail,
  MediaAssetKind,
  MediaAssetListResponse,
  MediaAssetRow,
  MediaAssetSource,
  MediaGallerySummary,
  MediaUsageStatus,
} from '../../lib/media/types';
import { can } from '../../lib/permissions/can';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';
import { adminInputClass, adminSecondaryButtonClass, adminSelectClass } from '../shared/admin-form-controls';
import { ErrorState, LoadingState } from '../shared/async-state';
import { PageSection } from '../shared/page-section';
import { MediaAssetDetailModal } from './media-asset-detail-modal';

const PAGE_SIZE = 24;

export function MediaGalleryManager({
  permissions,
}: Readonly<{
  permissions: string[];
}>): React.JSX.Element {
  const [rows, setRows] = useState<MediaAssetRow[]>([]);
  const [meta, setMeta] = useState<MediaAssetListResponse['meta'] | null>(null);
  const [summary, setSummary] = useState<MediaGallerySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | MediaAssetKind>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | MediaAssetSource>('ALL');
  const [usageFilter, setUsageFilter] = useState<MediaUsageStatus>('ALL');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canDelete = can(permissions, ['media.delete']);
  const canUpload = can(permissions, ['media.upload']);

  const loadAssets = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      setListError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (kindFilter !== 'ALL') {
        params.set('kind', kindFilter);
      }

      if (sourceFilter !== 'ALL') {
        params.set('source', sourceFilter);
      }

      if (usageFilter !== 'ALL') {
        params.set('usageStatus', usageFilter);
      }

      const payload = await adminFetchEnvelope<MediaAssetRow[], MediaAssetListResponse['meta']>(
        `/media/assets?${params.toString()}`,
      );
      setRows(payload.data ?? []);
      setMeta(payload.meta ?? null);
    } catch (caught) {
      setListError(adminMessageFromUnknownError(caught, 'Medya galerisi yüklenemedi.'));
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [kindFilter, page, search, sourceFilter, usageFilter]);

  const loadSummary = useCallback(async (): Promise<void> => {
    try {
      const [all, images, videos, used] = await Promise.all([
        adminFetchEnvelope<MediaAssetRow[], MediaAssetListResponse['meta']>('/media/assets?page=1&limit=1'),
        adminFetchEnvelope<MediaAssetRow[], MediaAssetListResponse['meta']>('/media/assets?page=1&limit=1&kind=IMAGE'),
        adminFetchEnvelope<MediaAssetRow[], MediaAssetListResponse['meta']>('/media/assets?page=1&limit=1&kind=VIDEO'),
        adminFetchEnvelope<MediaAssetRow[], MediaAssetListResponse['meta']>('/media/assets?page=1&limit=1&usageStatus=USED'),
      ]);

      setSummary({
        total: all.meta?.total ?? 0,
        imageCount: images.meta?.total ?? 0,
        videoCount: videos.meta?.total ?? 0,
        usedCount: used.meta?.total ?? 0,
      });
    } catch {
      setSummary(null);
    }
  }, []);

  const loadAssetDetail = useCallback(async (assetId: string): Promise<void> => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedAsset(null);

    try {
      const payload = await adminFetch<MediaAssetDetail>(`/media/assets/${assetId}`);
      setSelectedAsset(payload);
    } catch (caught) {
      setDetailError(adminMessageFromUnknownError(caught, 'Medya detayı yüklenemedi.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!selectedAssetId) {
      setSelectedAsset(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    void loadAssetDetail(selectedAssetId);
  }, [loadAssetDetail, selectedAssetId]);

  const hasActiveFilters =
    search.trim().length > 0 || kindFilter !== 'ALL' || sourceFilter !== 'ALL' || usageFilter !== 'ALL';

  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const listSummaryText = useMemo(() => {
    if (loading) {
      return 'Medya envanteri hazırlanıyor…';
    }

    if (!meta) {
      return 'Medya sonuçları henüz hazır değil.';
    }

    if (hasActiveFilters) {
      return `${meta.total} medya seçili filtrelerle eşleşiyor`;
    }

    return `${meta.total} medya dosyası son yüklenme tarihine göre listeleniyor`;
  }, [hasActiveFilters, loading, meta]);

  async function handleDeleteConfirmed(asset: MediaAssetDetail): Promise<void> {
    if (!canDelete) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteConfirmId(null);
      setDetailError(null);
      setInfo(null);

      const payload = await adminFetch<MediaAssetDeleteResponse>(`/media/assets/${asset.id}`, {
        method: 'DELETE',
      });

      setInfo(buildMediaDeleteSuccessMessage(payload));
      setSelectedAssetId(null);
      setSelectedAsset(null);

      const shouldStepBackPage = rows.length === 1 && page > 1;

      if (shouldStepBackPage) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await loadAssets();
      }

      await loadSummary();
    } catch (caught) {
      setDetailError(adminMessageFromUnknownError(caught, 'Medya silinemedi.'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleUploadFiles(files: FileList): Promise<void> {
    if (!canUpload || files.length === 0) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    setInfo(null);

    let successCount = 0;
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append('file', file);
        await adminFetch<unknown>('/media/assets/upload', { method: 'POST', body: form });
        successCount++;
      } catch (caught) {
        errors.push(`${file.name}: ${adminMessageFromUnknownError(caught, 'Yükleme başarısız.')}`);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      setInfo(
        `${successCount} dosya başarıyla yüklendi.${errors.length > 0 ? ` ${errors.length} dosya yüklenemedi.` : ''}`,
      );
      await loadAssets();
      await loadSummary();
    } else {
      setUploadError(errors.join(' '));
    }
  }

  return (
    <>
      <PageSection
        title="Media Galeri"
        description="Sunucudaki görsel ve videoları tek operatör yüzeyinde filtreleyin, kullanım bağlarını görün ve güvenli silme etkisini inceleyin."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BakeryStatCard
            size="minimal"
            label="Toplam medya"
            value={String(summary?.total ?? '—')}
            iconGoogle="photo_library"
            accent="surface"
          />
          <BakeryStatCard
            size="minimal"
            label="Görsel"
            value={String(summary?.imageCount ?? '—')}
            iconGoogle="image"
            accent="secondary"
          />
          <BakeryStatCard
            size="minimal"
            label="Video"
            value={String(summary?.videoCount ?? '—')}
            iconGoogle="movie"
            accent="tertiary"
          />
          <BakeryStatCard
            size="minimal"
            label="Kullanımda"
            value={String(summary?.usedCount ?? '—')}
            iconGoogle="link"
            accent="alert"
          />
        </div>

        <p className="text-sm text-on-surface-variant">
          Üst kartlar tüm medya kütüphanesini özetler; aşağıdaki filtreler yalnızca grid görünümünü değiştirir.
        </p>

        {info ? (
          <div className="rounded-2xl border border-tertiary/25 bg-tertiary-container px-4 py-3 text-sm font-semibold text-tertiary">
            {info}
          </div>
        ) : null}

        {uploadError ? (
          <div className="rounded-2xl border border-error/20 bg-error-container/45 px-4 py-3 text-sm font-medium text-error">
            {uploadError}
          </div>
        ) : null}

        {listError ? <ErrorState message={listError} /> : null}

        <div className="grid gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:grid-cols-[minmax(0,1.8fr),minmax(0,1fr),minmax(0,1fr),minmax(0,1fr)]">
          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Ara</span>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                search
              </span>
              <input
                className={`${adminInputClass} pl-10`}
                placeholder="Başlık, object key veya MIME türü…"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
              />
            </div>
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Medya türü</span>
            <select
              className={adminSelectClass}
              value={kindFilter}
              onChange={(event) => {
                setPage(1);
                setKindFilter(event.target.value as 'ALL' | MediaAssetKind);
              }}
            >
              {MEDIA_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Kaynak</span>
            <select
              className={adminSelectClass}
              value={sourceFilter}
              onChange={(event) => {
                setPage(1);
                setSourceFilter(event.target.value as 'ALL' | MediaAssetSource);
              }}
            >
              {MEDIA_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Kullanım durumu</span>
            <select
              className={adminSelectClass}
              value={usageFilter}
              onChange={(event) => {
                setPage(1);
                setUsageFilter(event.target.value as MediaUsageStatus);
              }}
            >
              {MEDIA_USAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-on-surface-variant">{listSummaryText}</p>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            {canUpload ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files) {
                      void handleUploadFiles(event.target.files);
                    }
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary shadow-bakery transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {uploading ? 'progress_activity' : 'upload'}
                  </span>
                  {uploading ? 'Yükleniyor…' : 'Yükle'}
                </button>
              </>
            ) : null}
            <span>
              Sayfa {meta?.page ?? page} / {totalPages}
            </span>
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={(meta?.page ?? page) <= 1 || loading}
            >
              Önceki
            </button>
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={(meta?.page ?? page) >= totalPages || loading}
            >
              Sonraki
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Medya galerisi yükleniyor…" />
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-outline-variant/45 bg-surface-container-lowest px-8 py-16 text-center shadow-bakery">
            <span className="material-symbols-outlined text-[48px] text-outline">photo_library</span>
            <p className="mt-4 font-display text-lg font-semibold text-on-surface">Eşleşen medya bulunamadı</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {hasActiveFilters
                ? 'Filtreleri gevşeterek veya aramayı temizleyerek sonuçları genişletin.'
                : 'Henüz medya yüklenmemiş görünüyor.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedAssetId === asset.id}
                onSelect={() => {
                  setInfo(null);
                  setSelectedAssetId(asset.id);
                }}
              />
            ))}
          </div>
        )}
      </PageSection>

      <MediaAssetDetailModal
        open={selectedAssetId !== null}
        asset={selectedAsset}
        loading={detailLoading}
        error={detailError}
        canDelete={canDelete}
        deleting={deleting}
        confirmingDelete={deleteConfirmId === selectedAssetId}
        onDeleteRequest={() => {
          if (selectedAssetId) {
            setDeleteConfirmId(selectedAssetId);
          }
        }}
        onDeleteConfirm={(asset) => {
          void handleDeleteConfirmed(asset);
        }}
        onDeleteCancel={() => setDeleteConfirmId(null)}
        onClose={() => {
          if (deleting) {
            return;
          }

          setSelectedAssetId(null);
          setSelectedAsset(null);
          setDetailError(null);
          setDeleteConfirmId(null);
        }}
      />
    </>
  );
}

function AssetCard({
  asset,
  selected,
  onSelect,
}: Readonly<{
  asset: MediaAssetRow;
  selected: boolean;
  onSelect: () => void;
}>): React.JSX.Element {
  return (
    <button
      type="button"
      className={`overflow-hidden rounded-card border bg-surface-container-lowest text-left shadow-bakery transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(24,32,43,0.08)] ${
        selected
          ? 'border-secondary bg-secondary-container/15'
          : 'border-outline-variant/35 hover:border-secondary/30'
      }`}
      onClick={onSelect}
    >
      <div className="relative overflow-hidden border-b border-outline-variant/20 bg-surface-container-low">
        <AssetCardPreview asset={asset} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 to-transparent px-3 py-3 text-white">
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold">{formatMediaKind(asset.kind)}</span>
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold">
            {formatMediaUsageBadge(asset.usage)}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5 text-on-surface">{asset.title}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{formatMediaSource(asset.source)}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
          <CardPill icon="link">{formatMediaUsage(asset.usage)}</CardPill>
          <CardPill icon="schedule">{formatMediaShortDate(asset.createdAt)}</CardPill>
        </div>

        <p className="truncate font-mono text-[11px] text-outline">{asset.objectKey}</p>
      </div>
    </button>
  );
}

function AssetCardPreview({ asset }: Readonly<{ asset: MediaAssetRow }>): React.JSX.Element {
  if (asset.kind === 'VIDEO') {
    return (
      <div className="relative aspect-square w-full bg-surface-container-low">
        <video className="h-full w-full object-cover" src={asset.url} muted playsInline preload="metadata" />
        <span className="material-symbols-outlined absolute inset-0 m-auto h-fit w-fit rounded-full bg-black/45 p-2 text-[20px] text-white">
          play_arrow
        </span>
      </div>
    );
  }

  return <img src={asset.url} alt={asset.title} className="aspect-square w-full object-cover" loading="lazy" />;
}

function CardPill({
  icon,
  children,
}: Readonly<{ icon: string; children: React.ReactNode }>): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container-low px-2.5 py-1">
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {children}
    </span>
  );
}
