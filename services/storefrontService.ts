import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { Product, Category, Brand, StoreReview, ReviewSummary } from '@/types/storefront';

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
  storefront_active?: boolean;
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

export interface SearchSuggestProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number | null;
  category: { id: string; name: string; slug: string; image: string | null } | null;
}

export interface SearchSuggestCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export interface SearchSuggestBrand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface SearchSuggestions {
  products: SearchSuggestProduct[];
  categories: SearchSuggestCategory[];
  brands: SearchSuggestBrand[];
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
    category_id?: number | string;
    brand_id?: number | string;
    sort?: string;
    page?: number;
    per_page?: number;
    is_featured?: boolean;
    is_new?: boolean;
    is_bestseller?: boolean;
    is_on_sale?: boolean;
    search?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    min_rating?: number;
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

  async searchSuggest(query: string, options?: { limit?: number; signal?: AbortSignal }): Promise<SearchSuggestions> {
    const response = await apiClient.get<{ success: boolean; data: SearchSuggestions }>(
      '/api/v1/storefront/search/suggest',
      { params: { q: query, limit: options?.limit }, signal: options?.signal }
    );
    return response.data.data ?? { products: [], categories: [], brands: [] };
  }

  /** Most-searched terms for the active storefront (last 30 days), for the "Trending" search suggestions. */
  async getTrendingSearches(limit = 8): Promise<string[]> {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(
      '/api/v1/storefront/search/trending',
      { params: { limit } }
    );
    return response.data.data ?? [];
  }

  /** Full-text product search (relevance-ranked) — powers the /store/search results page. */
  async search(params: {
    q: string;
    category_id?: number | string;
    brand_id?: number | string;
    sort?: string;
    page?: number;
    per_page?: number;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    min_rating?: number;
    is_featured?: boolean;
    is_new?: boolean;
    is_bestseller?: boolean;
    is_on_sale?: boolean;
  }): Promise<ProductsResponse> {
    const response = await apiClient.get<{ success: boolean; data: Product[]; meta: ProductsResponse['meta'] }>(
      '/api/v1/storefront/search',
      { params }
    );
    return { data: response.data.data, meta: response.data.meta };
  }

  async getBrands(params?: { per_page?: number }): Promise<{
    data: Brand[];
    meta: ProductsResponse['meta'];
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: Brand[];
      meta: ProductsResponse['meta'];
    }>('/api/v1/storefront/brands', { params });
    return { data: response.data.data, meta: response.data.meta };
  }

  async getBrand(
    slug: string,
    params?: { sort?: string; page?: number; per_page?: number; search?: string }
  ): Promise<{ brand: Brand; products: Product[]; meta: ProductsResponse['meta'] }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { brand: Brand; products: Product[] };
      meta: ProductsResponse['meta'];
    }>(`/api/v1/storefront/brands/${slug}`, { params });
    return {
      brand: response.data.data.brand,
      products: response.data.data.products,
      meta: response.data.meta,
    };
  }

  async getProductReviews(
    slug: string,
    params?: { page?: number; per_page?: number }
  ): Promise<{ items: StoreReview[]; summary: ReviewSummary }> {
    const response = await apiClient.get<{
      success: boolean;
      data: StoreReview[];
      meta: { current_page: number; last_page: number; per_page: number; total: number; summary: ReviewSummary };
    }>(`/api/v1/storefront/products/${slug}/reviews`, { params });
    return {
      items: response.data.data ?? [],
      summary: response.data.meta?.summary ?? { average: 0, total: 0, distribution: {} },
    };
  }

  async submitReview(payload: {
    product_slug: string;
    rating: number;
    title?: string;
    review?: string;
    images?: string[];
  }): Promise<{ id: string; status: string }> {
    const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>(
      '/api/v1/storefront/account/reviews',
      payload
    );
    return response.data.data;
  }

  async validateCoupon(
    code: string,
    items: { variation_id: string | number; quantity: number }[]
  ): Promise<{
    valid: boolean;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discount: number;
    min_order_amount: number;
    message?: string;
  }> {
    const response = await apiClient.post<ApiResponse<{
      valid: boolean;
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
      discount: number;
      min_order_amount: number;
      message?: string;
    }>>('/api/v1/storefront/coupons/validate', { code, items });
    return response.data.data;
  }

  async getWishlist(): Promise<{
    customer_id: string;
    items: {
      id: string;
      product_id: string;
      product_name: string;
      product_image: string | null;
      sku: string;
      price: number;
      stock_status: string;
      added_at: string;
    }[];
    total_items: number;
  }> {
    const response = await apiClient.get<ApiResponse<{
      customer_id: string;
      items: {
        id: string;
        product_id: string;
        product_name: string;
        product_image: string | null;
        sku: string;
        price: number;
        stock_status: string;
        added_at: string;
      }[];
      total_items: number;
    }>>('/api/v1/storefront/account/wishlist');
    return response.data.data;
  }

  async toggleWishlist(productId: string | number): Promise<void> {
    await apiClient.post('/api/v1/storefront/wishlist/toggle', {
      product_id: productId,
    });
  }
}

export default new StorefrontService();
