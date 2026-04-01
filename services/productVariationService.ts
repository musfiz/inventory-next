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
   * @param productId Optional product ID to base SKU on product name
   * @param productName Optional product name to use directly
   * @param attributeValues Optional array of attribute value texts to include in SKU generation
   */
  async generateSku(
    productId?: string,
    productName?: string,
    attributeValues?: string[]
  ): Promise<string> {
    // Build query string manually for array structure
    let url = '/api/v1/product-variations/generate-sku';
    const queryParams: string[] = [];
    
    if (productId) {
      queryParams.push(`product_id=${encodeURIComponent(productId)}`);
    }
    
    if (productName) {
      queryParams.push(`product_name=${encodeURIComponent(productName)}`);
    }
    
    if (attributeValues && attributeValues.length > 0) {
      attributeValues.forEach((value, index) => {
        queryParams.push(`attribute_values[${index}]=${encodeURIComponent(value)}`);
      });
    }
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    const response = await apiClient.get<ApiResponse<{ sku: string }>>(url);
    return response.data.data.sku;
  }

  /**
   * Get attributes for dropdown
   * GET /api/v1/product-variations/attributes
   */
  async getAttributes(businessType?: string): Promise<Attribute[]> {
    const response = await apiClient.get<ApiResponse<Attribute[]>>('/api/v1/product-variations/attributes');
    return response.data.data;
  }
}

export default new ProductVariationService();
