'use client';

import { create } from 'zustand';
import storefrontSettingsService from '@/services/storefrontSettingsService';

interface StorefrontSettingsStore {
  expressCheckoutEnabled: boolean;
  loading: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useStorefrontSettingsStore = create<StorefrontSettingsStore>()(
  (set, get) => ({
    expressCheckoutEnabled: false,
    loading: true,
    _fetchPromise: null,

    fetch: async () => {
      const { _fetchPromise } = get();
      if (_fetchPromise) return _fetchPromise;

      const promise = (async () => {
        try {
          const res = await storefrontSettingsService.get();
          set({ expressCheckoutEnabled: res.express_checkout_enabled ?? false, loading: false });
        } catch {
          set({ expressCheckoutEnabled: false, loading: false });
        } finally {
          set({ _fetchPromise: null });
        }
      })();

      set({ _fetchPromise: promise });
      return promise;
    },
  }),
);
