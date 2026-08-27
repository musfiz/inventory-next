import apiClient from '@/lib/api/axios';
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductListResponse,
  ApiResponse,
} from '@/types/api.types';

/**
 * Product Service
 * Handles all product-related API calls
 */
class ProductService {
  /**
   * Get all products with pagination
   * GET /api/v1/products
   */
  async getProducts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: string;
    brand_id?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<ProductListResponse> {
    const response = await apiClient.get<ApiResponse<ProductListResponse>>('/api/v1/products', {
      params,
    });
    return response.data.data;
  }

  /**
   * Get single product by ID
   * GET /api/v1/products/{id}
   */
  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(
      `/api/v1/products/${id}`
    );
    return response.data.data.product;
  }

  /**
   * Create new product
   * POST /api/v1/products
   */
  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>(
      '/api/v1/products',
      data
    );
    return response.data.data.product;
  }

  /**
   * Update existing product
   * POST /api/v1/products/{id}
   */
  async updateProduct(id: number | string, data: Partial<UpdateProductRequest>): Promise<Product> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>(
      `/api/v1/products/${id}`,
      data
    );
    return response.data.data.product;
  }

  /**
   * Delete product
   * DELETE /api/v1/products/{id}
   */
  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/products/${id}`);
  }
}

export default new ProductService();
