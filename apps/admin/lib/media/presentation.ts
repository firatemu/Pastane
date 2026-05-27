import type {
  MediaAssetDeleteResponse,
  MediaAssetDetail,
  MediaAssetKind,
  MediaAssetSource,
  MediaAssetUsageSummary,
  MediaUsageRef,
} from './types';

export const MEDIA_KIND_OPTIONS: Array<{ value: 'ALL' | MediaAssetKind; label: string }> = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'IMAGE', label: 'Görsel' },
  { value: 'VIDEO', label: 'Video' },
];

export const MEDIA_SOURCE_OPTIONS: Array<{ value: 'ALL' | MediaAssetSource; label: string }> = [
  { value: 'ALL', label: 'Tüm kaynaklar' },
  { value: 'GALLERY_UPLOAD', label: 'Galeri yüklemesi' },
  { value: 'PRODUCT_UPLOAD', label: 'Ürün yüklemesi' },
  { value: 'BANNER_UPLOAD', label: 'Banner yüklemesi' },
];

export const MEDIA_USAGE_OPTIONS: Array<{ value: 'ALL' | 'USED' | 'UNUSED'; label: string }> = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'USED', label: 'Kullanımda' },
  { value: 'UNUSED', label: 'Boşta' },
];

export function formatMediaKind(kind: MediaAssetKind): string {
  return kind === 'VIDEO' ? 'Video' : 'Görsel';
}

export function formatMediaSource(source: MediaAssetSource): string {
  switch (source) {
    case 'PRODUCT_UPLOAD':
      return 'Ürün yüklemesi';
    case 'BANNER_UPLOAD':
      return 'Banner yüklemesi';
    default:
      return 'Galeri yüklemesi';
  }
}

export function formatMediaUsage(usage: MediaAssetUsageSummary): string {
  const parts: string[] = [];

  if (usage.productImageCount > 0) {
    parts.push(`${usage.productImageCount} üründe`);
  }

  if (usage.bannerCount > 0) {
    parts.push(`${usage.bannerCount} banner’da`);
  }

  if (parts.length === 0) {
    return 'Henüz kullanımda değil';
  }

  return `${parts.join(', ')} kullanılıyor`;
}

export function formatMediaUsageBadge(usage: MediaAssetUsageSummary): string {
  return usage.isUsed ? 'Kullanımda' : 'Boşta';
}

export function formatMediaUsageImpact(asset: MediaAssetDetail): string {
  const parts: string[] = [];

  if (asset.usage.productImageCount > 0) {
    parts.push(`${asset.usage.productImageCount} ürün görseli`);
  }

  if (asset.usage.bannerCount > 0) {
    parts.push(`${asset.usage.bannerCount} banner`);
  }

  if (asset.usage.bannerSlotCount > 0) {
    parts.push(`${asset.usage.bannerSlotCount} banner slotu`);
  }

  if (parts.length === 0) {
    return 'Bu medya şu an kullanımda değil; silme işlemi yalnızca dosyayı galeriden kaldırır.';
  }

  return `Silme işleminde ${parts.join(', ')} bağlantısı ayrılır. Banner bağlıysa ilgili slot temizlenir ve banner pasife alınır.`;
}

export function buildMediaDeleteConfirmation(asset: MediaAssetDetail): string {
  return [
    `"${asset.title}" kalıcı olarak silinsin mi?`,
    '',
    formatMediaUsageImpact(asset),
    '',
    'Bu işlem geri alınamaz.',
  ].join('\n');
}

export function buildMediaDeleteSuccessMessage(result: MediaAssetDeleteResponse): string {
  const segments: string[] = [];

  if (result.detachedProductImageCount > 0) {
    segments.push(`${result.detachedProductImageCount} ürün görseli ayrıldı`);
  }

  if (result.detachedBannerCount > 0) {
    segments.push(`${result.detachedBannerCount} banner etkilendi`);
  }

  if (segments.length === 0) {
    return 'Medya dosyası galeriden kaldırıldı.';
  }

  return `Medya dosyası kaldırıldı; ${segments.join(', ')}.`;
}

export function formatMediaFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 1024) {
    return `${Math.max(Math.round(size), 0)} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[index]}`;
}

export function formatMediaDateTime(value: string): string {
  return new Date(value).toLocaleString('tr-TR');
}

export function formatMediaShortDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

export function formatUsageRefTitle(ref: MediaUsageRef): string {
  if (ref.type === 'PRODUCT_IMAGE') {
    return ref.productName;
  }

  return ref.bannerTitle;
}

export function formatUsageRefMeta(ref: MediaUsageRef): string {
  if (ref.type === 'PRODUCT_IMAGE') {
    const parts = [`Slug: ${ref.productSlug}`];

    if (ref.isPrimary) {
      parts.push('Birincil görsel');
    }

    parts.push(`Sıra: ${ref.sortOrder}`);

    if (ref.altText?.trim()) {
      parts.push(`Alt metin: ${ref.altText}`);
    }

    return parts.join(' • ');
  }

  return `${ref.type === 'BANNER_DESKTOP' ? 'Masaüstü slotu' : 'Mobil slot'} • ${ref.isActive ? 'Aktif' : 'Pasif'}`;
}
