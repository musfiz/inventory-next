'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import storefrontService from '@/services/storefrontService';

interface WishlistState {
  items: string[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  /** Replace local items with server data fetched via SWR (see useWishlistIds). */
  replaceItems: (items: string[]) => void;
  /** Best-effort background sync of a single toggle to the server. */
  pushToServer: (productId: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      add: productId => {
        set(state =>
          state.items.includes(productId)
            ? state
            : { items: [...state.items, productId] }
        );
        get().pushToServer(productId);
      },

      remove: productId => {
        set(state => ({
          items: state.items.filter(id => id !== productId),
        }));
        get().pushToServer(productId);
      },

      toggle: productId => {
        set(state =>
          state.items.includes(productId)
            ? { items: state.items.filter(id => id !== productId) }
            : { items: [...state.items, productId] }
        );
        get().pushToServer(productId);
      },

      has: productId => get().items.includes(productId),

      clear: () => set({ items: [] }),

      replaceItems: items => set({ items }),

      pushToServer: productId => {
        storefrontService.toggleWishlist(productId).catch(() => {
          // Best-effort server sync; ignore failures (e.g. guest checkout).
        });
      },
    }),
    { name: 'uims-wishlist' }
  )
);
