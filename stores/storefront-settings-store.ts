'use client';

import { create } from 'zustand';
import storefrontSettingsService from '@/services/storefrontSettingsService';

interface StorefrontSettingsStore {
  expressCheckoutEnabled: boolean;
  storeName: string | null;
  storefrontTheme: 'default' | 'grocery';
  loading: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useStorefrontSettingsStore = create<StorefrontSettingsStore>()(
  (set, get) => ({
    expressCheckoutEnabled: false,
    storeName: null,
    storefrontTheme: 'default',
    loading: true,
    _fetchPromise: null,

    fetch: async () => {
      const { _fetchPromise } = get();
      if (_fetchPromise) return _fetchPromise;

      const promise = (async () => {
        try {
          const res = await storefrontSettingsService.get();
          set({
            expressCheckoutEnabled: res.express_checkout_enabled ?? false,
            storeName: res.store_name ?? null,
            storefrontTheme: (res.storefront_theme as 'default' | 'grocery') ?? 'default',
            loading: false,
          });
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
