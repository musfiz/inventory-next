import apiClient from '@/lib/api/axios';
import type {
  ProductVariation,
  CreateProductVariationRequest,
  UpdateProductVariationRequest,
  ProductVariationListResponse,
  ApiResponse,
  Product,
  Attribute,
} from '@/types/api.types';

/**
 * Product Variation Service
 * Handles all product variation-related API calls
 */
class ProductVariationService {
  /**
   * Get all product variations with pagination
   * GET /api/v1/product-variations
   */
  async getVariations(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    product_id?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<ProductVariationListResponse> {
    const response = await apiClient.get<ApiResponse<ProductVariationListResponse>>('/api/v1/product-variations', {
      params,
    });
    return response.data.data;
  }

  /**
   * Get single variation by ID
   * GET /api/v1/product-variations/{id}
   */
  async getVariation(id: string): Promise<ProductVariation> {
    const response = await apiClient.get<ApiResponse<{ variation: ProductVariation }>>(`/api/v1/product-variations/${id}`);
    return response.data.data.variation;
  }

  /**
   * Create new variation
   * POST /api/v1/product-variations
   */
  async createVariation(data: CreateProductVariationRequest): Promise<ProductVariation> {
    const response = await apiClient.post<ApiResponse<{ variation: ProductVariation }>>('/api/v1/product-variations', data);
    return response.data.data.variation;
  }

  /**
   * Update existing variation
   * PUT /api/v1/product-variations/{id}
   */
  async updateVariation(data: UpdateProductVariationRequest): Promise<ProductVariation> {
    const response = await apiClient.put<ApiResponse<{ variation: ProductVariation }>>(`/api/v1/product-variations/${data.id}`, data);
    return response.data.data.variation;
  }

  /**
   * Delete variation
   * DELETE /api/v1/product-variations/{id}
   */
  async deleteVariation(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/product-variations/${id}`);
  }

  /**
   * Generate unique SKU
   * GET /api/v1/product-variations/generate-sku
   */
  async generateSku(productId?: string): Promise<string> {
    const response = await apiClient.get<ApiResponse<{ sku: string }>>('/api/v1/product-variations/generate-sku', {
      params: productId ? { product_id: productId } : {},
    });
    return response.data.data.sku;
  }

  /**
   * Get products for dropdown (only variable products)
   * GET /api/v1/product-variations/products
   */
  async getProducts(): Promise<Product[]> {
    const response = await apiClient.get<ApiResponse<Product[]>>('/api/v1/product-variations/products');
    return response.data.data;
  }

  /**
   * Get attributes for dropdown
   * GET /api/v1/product-variations/attributes
   */
  async getAttributes(businessType?: string): Promise<Attribute[]> {
    const response = await apiClient.get<ApiResponse<Attribute[]>>('/api/v1/product-variations/attributes', {
      params: businessType ? { business_type: businessType } : {},
    });
    return response.data.data;
  }
}

export default new ProductVariationService();
