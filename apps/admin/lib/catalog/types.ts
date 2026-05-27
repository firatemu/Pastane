export interface ApiEnvelope<T> { data: T; meta?: PaginationMeta; }
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }
export type MediaAssetKind = 'IMAGE' | 'VIDEO';
export type MediaAssetSource = 'PRODUCT_UPLOAD' | 'BANNER_UPLOAD' | 'GALLERY_UPLOAD';
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
export interface MediaAssetListResponse {
  items: MediaAssetRow[];
  meta: PaginationMeta;
}
export interface Category { id:string; name:string; slug:string; description:string|null; imageUrl:string|null; parentId:string|null; sortOrder:number; isActive:boolean; children?:Category[]; }
export interface Allergen { id:string; name:string; }
export interface ProductUnit {
  id: string;
  name: string;
  symbol: string;
  kind: 'COUNT' | 'WEIGHT' | 'VOLUME';
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}
export interface ProductImage { id:string; url:string; altText:string|null; sortOrder:number; isPrimary:boolean; }
export interface ProductOption { id:string; name:string; priceModifier:string; isActive:boolean; sortOrder:number; }
export interface ProductOptionGroup { id:string; name:string; isRequired:boolean; isMultiple:boolean; sortOrder:number; options:ProductOption[]; }
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  discountedPrice: string | null;
  unitId: string;
  unitQuantity: string | null;
  unit: ProductUnit;
  displayName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  isPublished: boolean;
  saleWindowStart?: string | null;
  saleWindowEnd?: string | null;
  isPurchasable?: boolean;
  availabilityReason?: 'UNPUBLISHED' | 'OUTSIDE_SALE_WINDOW' | 'INACTIVE' | 'OUT_OF_STOCK' | null;
  preparationMinutes: number | null;
  categoryId: string;
  category: Category;
  images: ProductImage[];
  allergens: Array<{ allergen: Allergen }>;
  optionGroups: ProductOptionGroup[];
}
export interface Store { id:string; name:string; phone:string|null; city:string; district:string; address:string; latitude:string|null; longitude:string|null; isActive:boolean; }
export interface DeliveryZone { id:string; name:string; minimumOrderPrice:string|null; deliveryFee:string; estimatedMinutes:number|null; isActive:boolean; }
