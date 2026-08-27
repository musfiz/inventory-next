'use client';

import { create } from 'zustand';
import storefrontService from '@/services/storefrontService';
import type { CategoryTreeItem } from '@/services/storefrontService';

interface StorefrontCategoriesStore {
  categories: CategoryTreeItem[];
  loading: boolean;
  ready: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useStorefrontCategoriesStore = create<StorefrontCategoriesStore>()((set, get) => ({
  categories: [],
  loading: false,
  ready: false,
  _fetchPromise: null,

  fetch: async () => {
    const { ready, categories, _fetchPromise } = get();
    // Already loaded successfully — reuse the cached categories instead of
    // refetching on every dropdown open or navigation.
    if (ready && categories.length > 0) return;
    if (_fetchPromise) return _fetchPromise;

    set({ loading: true });

    const promise = (async () => {
      try {
        const categories = await storefrontService.getCategories();
        set({
          categories,
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
