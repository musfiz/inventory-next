'use client';

import { create } from 'zustand';
import storefrontService from '@/services/storefrontService';
import type { Brand } from '@/types/storefront';

interface StorefrontBrandsStore {
  brands: Brand[];
  loading: boolean;
  ready: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useStorefrontBrandsStore = create<StorefrontBrandsStore>()((set, get) => ({
  brands: [],
  loading: false,
  ready: false,
  _fetchPromise: null,

  fetch: async () => {
    const { ready, brands, _fetchPromise } = get();
    if (ready && brands.length > 0) return;
    if (_fetchPromise) return _fetchPromise;

    set({ loading: true });

    const promise = (async () => {
      try {
        const res = await storefrontService.getBrands({ per_page: 100 });
        set({
          brands: res.data,
          loading: false,
          ready: true,
        });
      } catch {
        set({ loading: false, ready: true });
      } finally {
        set({ _fetchPromise: null });
      }
    })();

    set({ _fetchPromise: promise });
    return promise;
  },
}));
