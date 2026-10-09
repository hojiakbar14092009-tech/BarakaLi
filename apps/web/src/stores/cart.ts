import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { MAX_CART_ITEMS, MAX_ITEM_QUANTITY, type CartItemInput } from '@barakali/shared';

const memoryFallback = new Map<string, string>();

/** localStorage can throw (private mode, blocked data); the cart then lives in memory only. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memoryFallback.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memoryFallback.delete(name);
    }
  },
};

interface CartState {
  items: CartItemInput[];
  add: (productId: string, quantity: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const clamp = (quantity: number) => Math.min(Math.max(Math.floor(quantity), 1), MAX_ITEM_QUANTITY);

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (productId, quantity) =>
        set((state) => {
          const existing = state.items.find((item) => item.productId === productId);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: clamp(item.quantity + quantity) }
                  : item,
              ),
            };
          }
          if (state.items.length >= MAX_CART_ITEMS) return state;
          return { items: [...state.items, { productId, quantity: clamp(quantity) }] };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity: clamp(quantity) } : item,
          ),
        })),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'barakali.cart', storage: createJSONStorage(() => safeStorage) },
  ),
);

export const selectCartCount = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);
