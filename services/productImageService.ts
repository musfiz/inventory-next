import apiClient from '@/lib/api/axios';
import type {
  ApiResponse,
  ProductImage,
  CreateProductImageRequest,
  ProductImageListResponse,
} from '@/types/api.types';

/**
 * Product Image Service
 * Handles product image related API calls
 */
class ProductImageService {
  /**
   * Get all product images (without product filter)
   * GET /api/v1/product-images
   */
  async getAllImages(
    params?: {
      page?: number;
      per_page?: number;
    }
  ): Promise<ProductImageListResponse> {
    const response = await apiClient.get<ApiResponse<ProductImageListResponse>>(
      '/api/v1/products/images',
      { params }
    );
    return response.data.data;
  }

  /**
   * Get product images for a specific product
   * GET /api/v1/products/{productId}/images
   */
  async getProductImages(
    productId: string,
    params?: {
      page?: number;
      per_page?: number;
    }
  ): Promise<ProductImageListResponse> {
    const response = await apiClient.get<ApiResponse<ProductImageListResponse>>(
      `/api/v1/products/images/${productId}`,
      { params }
    );
    return response.data.data;
  }

  /**
   * Upload product image
   * POST /api/v1/products/{productId}/images
   */
  async uploadProductImage(
    productId: string,
    data: CreateProductImageRequest,
    axiosConfig?: Record<string, any>
  ): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('image', data.image);
    if (data.variation_id) formData.append('variation_id', data.variation_id);
    if (data.alt_text) formData.append('alt_text', data.alt_text);
    if (data.is_primary !== undefined) formData.append('is_primary', data.is_primary ? '1' : '0');
    if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));

    const response = await apiClient.post<ApiResponse<{ image: ProductImage }>>(
      `/api/v1/products/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...(axiosConfig || {}),
      }
    );
    return response.data.data.image;
  }

  /**
   * Delete product image
   * DELETE /api/v1/products/{productId}/images/{imageId}
   */
  async deleteProductImage(imageId: string): Promise<void> {
    await apiClient.delete(`/api/v1/products/images/${imageId}`);
  }

  /**
   * Set primary image
   * PATCH /api/v1/products/{productId}/images/{imageId}/primary
   */
  async setPrimaryImage(imageId: string): Promise<void> {
    await apiClient.patch(`/api/v1/products/images/${imageId}/primary`);
  }
}

export default new ProductImageService();