'use client';

import { create } from 'zustand';
import apiClient from '@/lib/api/axios';

interface StorefrontStatusStore {
  active: boolean | null;
  loading: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useStorefrontStatusStore = create<StorefrontStatusStore>()(
  (set, get) => ({
    active: null,
    loading: true,
    _fetchPromise: null,

    fetch: async () => {
      const { _fetchPromise } = get();
      if (_fetchPromise) return _fetchPromise;

      const promise = (async () => {
        try {
          const res = await apiClient.get('/api/v1/storefront/status');
          set({ active: res.data?.data?.storefront_active ?? false, loading: false });
        } catch {
          set({ active: false, loading: false });
        } finally {
          set({ _fetchPromise: null });
        }
      })();

      set({ _fetchPromise: promise });
      return promise;
    },
  })
);
