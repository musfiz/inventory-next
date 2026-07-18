'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/api/axios';
import type { BrandingResponse } from '@/types/api.types';

const resolveImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

interface BrandingStore {
  headerLogo: string | null;
  footerLogo: string | null;
  favicon: string | null;
  loading: boolean;
  ready: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useBrandingStore = create<BrandingStore>()(
  persist(
    (set, get) => ({
      headerLogo: null,
      footerLogo: null,
      favicon: null,
      loading: false,
      ready: false,
      _fetchPromise: null,

      fetch: async () => {
        const { _fetchPromise } = get();

        if (_fetchPromise) return _fetchPromise;

        set({ loading: true });

        const promise = (async () => {
          try {
            const res = await apiClient.get<{ data: BrandingResponse }>('/api/v1/storefront/branding');
            const data = res.data?.data;
            if (!data) return;
            set({
              headerLogo: data.header_logo_url ? resolveImageUrl(data.header_logo_url) : null,
              footerLogo: data.footer_logo_url ? resolveImageUrl(data.footer_logo_url) : null,
              favicon: data.favicon_url ? resolveImageUrl(data.favicon_url) : null,
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
    }),
    {
      name: 'uims-branding',
      partialize: (state) => ({
        headerLogo: state.headerLogo,
        footerLogo: state.footerLogo,
        favicon: state.favicon,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && (state.headerLogo !== null || state.footerLogo !== null)) {
          state.ready = true;
        }
      },
    }
  )
);
