import apiClient from '@/lib/api/axios';
import type { ProductMediaItem } from '@/types/api.types';

class ProductMediaService {
  async getImages(productId: number, variationId?: number | null): Promise<ProductMediaItem[]> {
    const params: any = {};
    if (variationId) params.variation_id = variationId;
    const response = await apiClient.get<{
      success: boolean;
      data: ProductMediaItem[];
    }>(`/api/v1/ecommerce/products/product-media/${productId}`, { params });
    return response.data.data;
  }

  async uploadImage(formData: FormData): Promise<ProductMediaItem> {
    const response = await apiClient.post<{
      success: boolean;
      data: ProductMediaItem;
    }>('/api/v1/ecommerce/products/product-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  async deleteImage(imageId: number): Promise<void> {
    await apiClient.delete(`/api/v1/ecommerce/products/product-media/${imageId}`);
  }

  async setPrimary(imageId: number): Promise<void> {
    await apiClient.patch(`/api/v1/ecommerce/products/product-media/${imageId}/primary`);
  }
}

export default new ProductMediaService();
