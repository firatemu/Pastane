export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  description?: string | null;
  imageUrl?: string | null;
  children?: Category[];
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
  priceModifier: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  isMultiple: boolean;
  sortOrder: number;
  options: ProductOption[];
}

export interface ProductAllergen {
  allergen: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  discountedPrice: string | null;
  preparationMinutes: number | null;
  category: Category;
  images: ProductImage[];
  allergens: ProductAllergen[];
  optionGroups: ProductOptionGroup[];
  isPurchasable?: boolean;
  availabilityReason?: 'UNPUBLISHED' | 'OUTSIDE_SALE_WINDOW' | 'INACTIVE' | null;
}

export interface PaginatedProducts {
  items: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

export interface PaginatedReviews {
  items: PublicReview[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
  desktopMediaUrl: string;
  mobileMediaUrl: string;
  buttonText: string | null;
  buttonUrl: string | null;
  sortOrder: number;
}


export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

export interface Store {
  id: string;
  name: string;
  phone: string | null;
  city: string;
  district: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  workingHours: unknown | null;
  isActive: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  minimumOrderPrice: string | null;
  deliveryFee: string;
  estimatedMinutes: number | null;
  isActive: boolean;
}

export interface PaginatedStores {
  items: Store[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedDeliveryZones {
  items: DeliveryZone[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
