import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addCartItem as apiAdd,
  fetchCart,
  removeCartItem as apiRemove,
  updateCartItem as apiUpdate,
} from '../api/client';
import type { CartItem } from '../types';
import { useAuth } from './auth-context';

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  count: number;
  reload: () => Promise<void>;
  addItem: (productId: string, quantity?: number, optionIds?: string[], customNote?: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { auth } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!auth) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await fetchCart());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addItem = useCallback(
    async (productId: string, quantity = 1, optionIds: string[] = [], customNote?: string) => {
      await apiAdd(productId, quantity, optionIds, customNote);
      await reload();
    },
    [reload],
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (quantity < 1) {
        await apiRemove(id);
      } else {
        await apiUpdate(id, quantity);
      }
      await reload();
    },
    [reload],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await apiRemove(id);
      await reload();
    },
    [reload],
  );

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, loading, count, reload, addItem, updateQuantity, removeItem }),
    [items, loading, count, reload, addItem, updateQuantity, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
