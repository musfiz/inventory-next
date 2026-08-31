import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface StorefrontSettings {
  storefront_active: boolean;
  express_checkout_enabled: boolean;
  store_name?: string | null;
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
