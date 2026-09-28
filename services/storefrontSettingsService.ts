import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export type HomepageHeroWidget = 'hero_slider' | 'hero_grid_deals';

export interface StorefrontSettings {
  storefront_active: boolean;
  express_checkout_enabled: boolean;
  storefront_theme?: string | null;
  store_name?: string | null;
  /** Which widget renders in the homepage hero area. */
  homepage_hero_widget?: HomepageHeroWidget | null;
  /** Optional flash sale campaign pinned to the Weekly Deals rail. */
  weekly_deals_campaign_id?: string | null;
}

class StorefrontSettingsService {
  /** Public — consumed by the storefront UI to decide whether to show Express Checkout. */
  async get(): Promise<StorefrontSettings> {
    const response = await apiClient.get<ApiResponse<StorefrontSettings>>(
      '/api/v1/storefront/settings',
    );
    return response.data.data;
  }

  /** Admin — toggles storefront active / express checkout flags (auth required). */
  async update(data: Partial<StorefrontSettings> & { tenant_id?: string }): Promise<StorefrontSettings> {
    const response = await apiClient.put<ApiResponse<StorefrontSettings>>(
      '/api/v1/storefront/settings',
      data,
    );
    return response.data.data;
  }
}

const storefrontSettingsService = new StorefrontSettingsService();
export default storefrontSettingsService;
