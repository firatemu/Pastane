export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface ProductImage {
  id?: string;
  url: string;
  altText?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  priceModifier: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  isMultiple: boolean;
  sortOrder?: number;
  options: ProductOption[];
}

export interface ProductUnit {
  id: string;
  name: string;
  symbol: string;
  kind: 'COUNT' | 'WEIGHT' | 'VOLUME';
  sortOrder?: number;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  displayName?: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: string;
  discountedPrice?: string | null;
  preparationMinutes?: number | null;
  category?: Category;
  images?: ProductImage[];
  optionGroups?: ProductOptionGroup[];
  isPurchasable?: boolean;
  availabilityReason?: string | null;
}

export interface CartOption {
  optionId: string;
  option: { id: string; name: string; priceModifier: string };
}

export interface CartItem {
  id: string;
  quantity: number;
  unitPrice: string;
  customNote?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    discountedPrice?: string | null;
    images?: ProductImage[];
  };
  options?: CartOption[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Address {
  id: string;
  title: string;
  city: string;
  district: string;
  neighborhood?: string | null;
  fullAddress: string;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  directions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  phone?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  status?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: string;
  customNote?: string | null;
  product?: { id: string; slug: string; name: string };
  options?: Array<{ optionNameSnapshot: string; priceModifierSnapshot: string }>;
  review?: Review | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  deliveryType: 'HOME_DELIVERY' | 'PICKUP';
  status: string;
  subtotal: string;
  deliveryFee: string;
  serviceFee?: string;
  loyaltyDiscount?: string;
  loyaltyPointsUsed?: number;
  grandTotal: string;
  note?: string | null;
  items: OrderItem[];
  payments?: Payment[];
  delivery?: {
    id: string;
    status: string;
    failedReason?: string | null;
    pickedUpAt?: string | null;
    deliveredAt?: string | null;
  } | null;
  addressSnapshot?: {
    title?: string;
    city?: string;
    district?: string;
    fullAddress?: string;
  } | null;
  pickupStore?: { name: string; address: string; city?: string; district?: string } | null;
  statusHistory?: Array<{ id: string; status: string; note?: string | null; createdAt: string }>;
  createdAt: string;
}

export interface Payment {
  id: string;
  status: string;
  amount?: string;
  failureReason?: string | null;
  processingResult?: string | null;
}

export interface LoyaltyAccount {
  id: string;
  points: number;
  qrCode: string;
}

export interface LoyaltyMovement {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  desktopMediaUrl: string;
  mobileMediaUrl: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorPayload {
  success?: boolean;
  error?: { message?: string; code?: string };
  message?: string;
}
