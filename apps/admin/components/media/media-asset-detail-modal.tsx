'use client';

import { useEffect } from 'react';
import {
  formatMediaDateTime,
  formatMediaFileSize,
  formatMediaKind,
  formatMediaSource,
  formatMediaUsage,
  formatMediaUsageBadge,
  formatMediaUsageImpact,
  formatUsageRefMeta,
  formatUsageRefTitle,
} from '../../lib/media/presentation';
import type { MediaAssetDetail, MediaUsageRef } from '../../lib/media/types';
import { adminSecondaryButtonClass } from '../shared/admin-form-controls';
import { ErrorState, LoadingState } from '../shared/async-state';

const destructiveButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-error px-5 py-2.5 text-sm font-semibold text-surface-container-lowest shadow-bakery transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-60';

export function MediaAssetDetailModal({
  open,
  asset,
  loading,
  error,
  canDelete,
  deleting,
  confirmingDelete,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onClose,
}: Readonly<{
  open: boolean;
  asset: MediaAssetDetail | null;
  loading: boolean;
  error: string | null;
  canDelete: boolean;
  deleting: boolean;
  confirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteConfirm: (asset: MediaAssetDetail) => void;
  onDeleteCancel: () => void;
  onClose: () => void;
}>): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const productRefs = asset?.usage.refs.filter((ref) => ref.type === 'PRODUCT_IMAGE') ?? [];
  const bannerRefs =
    asset?.usage.refs.filter((ref) => ref.type === 'BANNER_DESKTOP' || ref.type === 'BANNER_MOBILE') ??
    [];

  return (
    <>
      <button
        type="button"
        aria-label="Detay panelini kapat"
        className="fixed inset-0 z-[60] bg-chocolate/25 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-2xl flex-col border-l border-outline-variant/35 bg-surface-container-lowest shadow-[0_0_40px_rgba(61,43,31,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-asset-detail-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/35 px-6 py-5">
          <div>
            <h2 id="media-asset-detail-title" className="font-display text-xl font-semibold text-on-surface">
              Medya detayı
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Dosya bilgisi, kullanım alanları ve güvenli silme etkisi tek panelde.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <LoadingState label="Medya detayı yükleniyor…" />
          ) : error && !asset ? (
            <ErrorState message={error} />
          ) : !asset ? (
            <ErrorState message="Medya detayı açılamadı." />
          ) : (
            <div className="space-y-5">
              {error ? (
                <div className="rounded-2xl border border-error/20 bg-error-container/45 px-4 py-3 text-sm font-medium text-error">
                  {error}
                </div>
              ) : null}

              <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-low">
                    <AssetPreview asset={asset} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{formatMediaKind(asset.kind)}</Badge>
                      <Badge tone={asset.usage.isUsed ? 'secondary' : 'muted'}>
                        {formatMediaUsageBadge(asset.usage)}
                      </Badge>
                      <Badge tone="muted">{formatMediaSource(asset.source)}</Badge>
                    </div>

                    <h3 className="mt-3 break-words font-display text-2xl font-semibold tracking-tight text-on-surface">
                      {asset.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {formatMediaUsage(asset.usage)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                      <MetaPill icon="folder">{asset.bucket}</MetaPill>
                      <MetaPill icon="draft">{asset.mimeType}</MetaPill>
                      <MetaPill icon="database">{formatMediaFileSize(asset.size)}</MetaPill>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className={adminSecondaryButtonClass}
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        Orijinali aç
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  icon="schedule"
                  label="Yüklenme zamanı"
                  value={formatMediaDateTime(asset.createdAt)}
                />
                <DetailCard
                  icon="update"
                  label="Son güncelleme"
                  value={formatMediaDateTime(asset.updatedAt)}
                />
                <DetailCard icon="key" label="Object key" value={asset.objectKey} emphasis="mono" />
                <DetailCard icon="link" label="Toplam kullanım" value={String(asset.usage.totalUsageCount)} />
              </section>

              <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-on-surface">Kullanım alanları</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Medyanın hangi ürün ve banner kayıtlarına bağlı olduğunu görün.
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    {asset.usage.refs.length} kayıt
                  </span>
                </div>

                {asset.usage.refs.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-outline-variant/45 bg-surface-container-low px-5 py-8 text-center">
                    <span className="material-symbols-outlined text-[40px] text-outline">link_off</span>
                    <p className="mt-3 font-medium text-on-surface">Bu medya henüz kullanılmıyor</p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Boşta duran dosyalar buradan güvenle temizlenebilir.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <UsageGroup
                      title="Ürün görselleri"
                      empty="Bu medya herhangi bir ürün görseline bağlı değil."
                      refs={productRefs}
                    />
                    <UsageGroup
                      title="Banner kullanımları"
                      empty="Bu medya herhangi bir banner slotuna bağlı değil."
                      refs={bannerRefs}
                    />
                  </div>
                )}
              </section>

              <section className="rounded-card border border-error/20 bg-error-container/25 p-5 shadow-bakery">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[22px] text-error">delete_forever</span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-on-surface">Silme etkisi</h3>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {formatMediaUsageImpact(asset)}
                    </p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      İşlem geri alınamaz; dosya kaldırılır, bağlı ürün görselleri arşivlenir ve banner slotları
                      temizlenir.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant/35 px-6 py-4">
          {confirmingDelete && asset ? (
            <div className="flex w-full flex-col gap-3 rounded-2xl border border-error/25 bg-error-container/30 px-4 py-3">
              <p className="text-sm font-semibold text-error">
                Bu medyayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={destructiveButtonClass}
                  onClick={() => onDeleteConfirm(asset)}
                  disabled={deleting}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {deleting ? 'progress_activity' : 'delete_forever'}
                  </span>
                  {deleting ? 'Siliniyor…' : 'Evet, sil'}
                </button>
                <button
                  type="button"
                  className={adminSecondaryButtonClass}
                  onClick={onDeleteCancel}
                  disabled={deleting}
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className={adminSecondaryButtonClass} onClick={onClose} disabled={deleting}>
                Kapat
              </button>
              {asset && canDelete ? (
                <button
                  type="button"
                  className={destructiveButtonClass}
                  onClick={onDeleteRequest}
                  disabled={deleting}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Medyayı sil
                </button>
              ) : asset ? (
                <p className="flex items-center rounded-xl border border-outline-variant/35 bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant">
                  Bu rolde medya silme yetkisi bulunmuyor.
                </p>
              ) : null}
            </>
          )}
        </footer>
      </aside>
    </>
  );
}

function AssetPreview({ asset }: Readonly<{ asset: MediaAssetDetail }>): React.JSX.Element {
  if (asset.kind === 'VIDEO') {
    return (
      <div className="relative aspect-square w-full bg-surface-container-low">
        <video className="h-full w-full object-cover" controls src={asset.url} />
      </div>
    );
  }

  return <img src={asset.url} alt={asset.title} className="aspect-square w-full object-cover" />;
}

function DetailCard({
  icon,
  label,
  value,
  emphasis = 'default',
}: Readonly<{
  icon: string;
  label: string;
  value: string;
  emphasis?: 'default' | 'mono';
}>): React.JSX.Element {
  return (
    <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-[20px] text-secondary">{icon}</span>
      </div>
      <p
        className={`mt-3 break-words text-sm font-semibold text-on-surface ${
          emphasis === 'mono' ? 'font-mono text-[13px]' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function UsageGroup({
  title,
  empty,
  refs,
}: Readonly<{
  title: string;
  empty: string;
  refs: MediaUsageRef[];
}>): React.JSX.Element {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold text-on-surface">{title}</h4>
        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
          {refs.length}
        </span>
      </div>

      {refs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-outline-variant/45 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {refs.map((ref) => (
            <div
              key={`${ref.type}-${ref.id}`}
              className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-on-surface">{formatUsageRefTitle(ref)}</p>
                <Badge tone={ref.type === 'PRODUCT_IMAGE' ? 'secondary' : 'muted'}>
                  {ref.type === 'PRODUCT_IMAGE' ? 'Ürün görseli' : 'Banner'}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{formatUsageRefMeta(ref)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({
  children,
  tone,
}: Readonly<{
  children: React.ReactNode;
  tone: 'neutral' | 'secondary' | 'muted';
}>): React.JSX.Element {
  const className =
    tone === 'secondary'
      ? 'border-secondary/20 bg-secondary-container text-secondary'
      : tone === 'muted'
        ? 'border-outline-variant/35 bg-surface-container-low text-on-surface-variant'
        : 'border-tertiary/20 bg-tertiary-container text-tertiary';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function MetaPill({
  icon,
  children,
}: Readonly<{ icon: string; children: React.ReactNode }>): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {children}
    </span>
  );
}
