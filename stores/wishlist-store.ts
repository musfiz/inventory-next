'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  items: string[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      add: productId =>
        set(state =>
          state.items.includes(productId)
            ? state
            : { items: [...state.items, productId] }
        ),

      remove: productId =>
        set(state => ({
          items: state.items.filter(id => id !== productId),
        })),

      toggle: productId =>
        set(state =>
          state.items.includes(productId)
            ? { items: state.items.filter(id => id !== productId) }
            : { items: [...state.items, productId] }
        ),

      has: productId => get().items.includes(productId),

      clear: () => set({ items: [] }),
    }),
    { name: 'uims-wishlist' }
  )
);
