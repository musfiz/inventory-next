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

export interface StorefrontFlashSaleCampaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  banner_image_url: string | null;
  products: StorefrontFlashSaleProduct[];
}

export interface StorefrontFlashSaleProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  selling_price: number;
  mrp: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  image_url: string | null;
  images: string[];
  original_price: number;
  sale_price: number;
  discount_percentage: number;
}

import type { StorefrontOfferSlide } from '@/types/storefront';

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryTreeItem[];
}

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

  async getFlashSale(): Promise<StorefrontFlashSaleCampaign[]> {
    const response = await apiClient.get<ApiResponse<{ campaigns: StorefrontFlashSaleCampaign[] }>>(
      '/api/v1/storefront/flash-sale'
    );
    return response.data.data?.campaigns ?? [];
  }

  async getCategoryBySlug(slug: string): Promise<CategoryPageData> {
    const response = await apiClient.get<ApiResponse<CategoryPageData>>(
      `/api/v1/storefront/category/${slug}`
    );
    return response.data.data;
  }

  async getCategories(): Promise<CategoryTreeItem[]> {
    const response = await apiClient.get<ApiResponse<CategoryTreeItem[]>>(
      '/api/v1/storefront/categories'
    );
    return response.data.data ?? [];
  }

  async getProducts(params: {
    category_id?: number;
    brand_id?: number;
    sort?: string;
    page?: number;
    per_page?: number;
    is_featured?: boolean;
    is_new?: boolean;
    is_bestseller?: boolean;
    is_on_sale?: boolean;
    search?: string;
  }): Promise<ProductsResponse> {
    const response = await apiClient.get<{ success: boolean; data: Product[]; meta: ProductsResponse['meta'] }>(
      '/api/v1/storefront/products',
      { params }
    );
    return { data: response.data.data, meta: response.data.meta };
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/api/v1/storefront/products/${slug}`
    );
    return response.data.data;
  }
}

export default new StorefrontService();
