export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface ProductImage {
  id?: string;
  url: string;
  altText?: string | null;
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: string;
  discountedPrice?: string | null;
  preparationMinutes?: number | null;
  category?: Category;
  images?: ProductImage[];
  isPurchasable?: boolean;
}

export interface CartItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'discountedPrice'>;
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

