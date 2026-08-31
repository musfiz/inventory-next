'use client';

import { create } from 'zustand';
import storefrontService from '@/services/storefrontService';

interface StorefrontTrendingStore {
  terms: string[];
  loading: boolean;
  ready: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useStorefrontTrendingStore = create<StorefrontTrendingStore>()((set, get) => ({
  terms: [],
  loading: false,
  ready: false,
  _fetchPromise: null,

  fetch: async () => {
    const { ready, _fetchPromise } = get();
    if (ready) return;
    if (_fetchPromise) return _fetchPromise;

    set({ loading: true });

    const promise = (async () => {
      try {
        const terms = await storefrontService.getTrendingSearches(8);
        set({
          terms,
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
