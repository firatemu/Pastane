import type { ProductImage } from '../catalog/types';

export type CartOption = { optionId: string; option: { id: string; name: string; priceModifier: string } };
export type CartItem = {
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
    images: ProductImage[];
  };
  options: CartOption[];
};
export type Cart = { id: string; items: CartItem[] };