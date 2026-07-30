'use client';

import { create } from 'zustand';
import headerMenuService from '@/services/headerMenuService';
import type { HeaderMenuConfig } from '@/types/api.types';

const DEFAULT_CONFIG: HeaderMenuConfig = {
  utility_bar_enabled: true,
  utility_bar_text_free_shipping: 'Free shipping over ৳5,000',
  utility_bar_text_discount: '10% off your first order',
  utility_bar_phone: '+880 1700-000000',
  utility_bar_bg_color: '#7c3aed',
  utility_bar_text_color: '#ffffff',
  nav_links: [],
  navigation_show_flash_sale: true,
  navigation_show_new_arrivals: true,
  menu_items: [],
  show_search_bar: true,
  show_wishlist_icon: true,
  show_account_icon: true,
  show_cart_icon: true,
  sticky_header: true,
  mega_menu_config: null,
};

interface HeaderMenuStore {
  config: HeaderMenuConfig;
  loading: boolean;
  ready: boolean;
  _fetchPromise: Promise<void> | null;
  fetch: () => Promise<void>;
}

export const useHeaderMenuStore = create<HeaderMenuStore>()((set, get) => ({
  config: DEFAULT_CONFIG,
  loading: false,
  ready: false,
  _fetchPromise: null,

  fetch: async () => {
    const { _fetchPromise } = get();
    if (_fetchPromise) return _fetchPromise;

    set({ loading: true });

    const promise = (async () => {
      try {
        const config = await headerMenuService.get();
        set({
          config,
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
