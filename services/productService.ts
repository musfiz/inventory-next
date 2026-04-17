import apiClient from '@/lib/api/axios';
import type {
  Product,
  ProductVariation,
  ProductImage,
  CreateProductRequest,
  UpdateProductRequest,
  CreateProductVariationRequest,
  UpdateProductVariationRequest,
  CreateProductImageRequest,
  ProductListResponse,
  ProductVariationListResponse,
  ProductImageListResponse,
  ApiResponse,
  Brand,
  Category,
  Unit,
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
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(`/api/v1/products/${id}`);
    return response.data.data.product;
  }

  /**
   * Create new product
   * POST /api/v1/products
   */
  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>('/api/v1/products', data);
    return response.data.data.product;
  }

  /**
   * Update existing product
   * PUT /api/v1/products/{id}
   */
  async updateProduct(data: UpdateProductRequest): Promise<Product> {
    const response = await apiClient.put<ApiResponse<{ product: Product }>>(`/api/v1/products/${data.id}`, data);
    return response.data.data.product;
  }

  /**
   * Delete product
   * DELETE /api/v1/products/{id}
   */
  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/products/${id}`);
  }

  /**
   * Get product images
   * GET /api/v1/products/{productId}/images
   */
  async getProductImages(productId: string, params?: {
    page?: number;
    per_page?: number;
  }): Promise<ProductImageListResponse> {
    const response = await apiClient.get<ApiResponse<ProductImageListResponse>>(
      `/api/v1/products/${productId}/images`,
      { params }
    );
    return response.data.data;
  }

  /**
   * Upload product image
   * POST /api/v1/products/{productId}/images
   */
  async uploadProductImage(productId: string, data: CreateProductImageRequest): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('image', data.image);
    if (data.variation_id) formData.append('variation_id', data.variation_id);
    if (data.alt_text) formData.append('alt_text', data.alt_text);
    if (data.is_primary !== undefined) formData.append('is_primary', data.is_primary.toString());
    if (data.sort_order !== undefined) formData.append('sort_order', data.sort_order.toString());

    const response = await apiClient.post<ApiResponse<{ image: ProductImage }>>(
      `/api/v1/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data.image;
  }

  /**
   * Delete product image
   * DELETE /api/v1/products/{productId}/images/{imageId}
   */
  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    await apiClient.delete(`/api/v1/products/${productId}/images/${imageId}`);
  }

  /**
   * Set primary image
   * PATCH /api/v1/products/{productId}/images/{imageId}/primary
   */
  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    await apiClient.patch(`/api/v1/products/${productId}/images/${imageId}/primary`);
  }
}

export default new ProductService();