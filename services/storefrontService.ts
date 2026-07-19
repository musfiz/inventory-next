import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { Product, Category } from '@/types/storefront';

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

import type { StorefrontOfferSlide } from '@/types/storefront';

export interface CategoryPageData {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  banner_image: string | null;
  description: string | null;
  parentId: string | null;
  children: Category[];
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

class StorefrontService {
  async getHeroSliders(): Promise<StorefrontHeroSlider[]> {
    const response = await apiClient.get<ApiResponse<StorefrontHeroSlider[]>>(
      '/api/v1/storefront/hero-sliders'
    );
    return response.data.data ?? [];
  }

  async getOfferSlides(): Promise<StorefrontOfferSlide[]> {
    const response = await apiClient.get<ApiResponse<StorefrontOfferSlide[]>>(
      '/api/v1/storefront/offer-slides'
    );
    return response.data.data ?? [];
  }

  async getCategoryBySlug(slug: string): Promise<CategoryPageData> {
    const response = await apiClient.get<ApiResponse<CategoryPageData>>(
      `/api/v1/storefront/category/${slug}`
    );
    return response.data.data;
  }

  async getProducts(params: {
    category_id?: number;
    sort?: string;
    page?: number;
    per_page?: number;
  }): Promise<ProductsResponse> {
    const response = await apiClient.get<{ success: boolean; data: Product[]; meta: ProductsResponse['meta'] }>(
      '/api/v1/storefront/products',
      { params }
    );
    return { data: response.data.data, meta: response.data.meta };
  }
}

export default new StorefrontService();
