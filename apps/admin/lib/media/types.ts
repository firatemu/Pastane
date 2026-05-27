import type { ApiEnvelope, PaginationMeta } from '../catalog/types';

export type MediaAssetKind = 'IMAGE' | 'VIDEO';

export type MediaAssetSource = 'PRODUCT_UPLOAD' | 'BANNER_UPLOAD' | 'GALLERY_UPLOAD';

export type MediaUsageStatus = 'ALL' | 'USED' | 'UNUSED';

export interface MediaAssetUsageSummary {
  productImageCount: number;
  bannerCount: number;
  bannerSlotCount: number;
  totalUsageCount: number;
  isUsed: boolean;
}

export interface MediaAssetRow {
  id: string;
  kind: MediaAssetKind;
  source: MediaAssetSource;
  bucket: string;
  objectKey: string;
  url: string;
  mimeType: string;
  size: number;
  title: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  usage: MediaAssetUsageSummary;
}

export type MediaUsageRef =
  | {
      type: 'PRODUCT_IMAGE';
      id: string;
      productId: string;
      productName: string;
      productSlug: string;
      altText: string | null;
      sortOrder: number;
      isPrimary: boolean;
    }
  | {
      type: 'BANNER_DESKTOP' | 'BANNER_MOBILE';
      id: string;
      bannerId: string;
      bannerTitle: string;
      isActive: boolean;
    };

export interface MediaAssetDetail extends Omit<MediaAssetRow, 'usage'> {
  usage: MediaAssetUsageSummary & {
    refs: MediaUsageRef[];
  };
}

export interface MediaAssetListResponse extends ApiEnvelope<MediaAssetRow[]> {
  meta: PaginationMeta;
}

export interface MediaAssetDeleteResponse {
  id: string;
  title: string;
  deletedAt: string | null;
  detachedProductImageCount: number;
  detachedBannerCount: number;
  detachedBannerSlotCount: number;
}

export interface MediaGallerySummary {
  total: number;
  imageCount: number;
  videoCount: number;
  usedCount: number;
}
