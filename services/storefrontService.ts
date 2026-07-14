import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface StorefrontHeroSlider {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

class StorefrontService {
  async getHeroSliders(): Promise<StorefrontHeroSlider[]> {
    const response = await apiClient.get<ApiResponse<StorefrontHeroSlider[]>>(
      '/api/v1/storefront/hero-sliders'
    );
    return response.data.data ?? [];
  }
}

export default new StorefrontService();
