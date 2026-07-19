import apiClient from '@/lib/api/axios';
import type { ProductFlagsItem } from '@/types/api.types';

class ProductFlagsService {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: number;
  }): Promise<{
    data: ProductFlagsItem[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }> {
    const response = await apiClient.get('/api/v1/ecommerce/products/flags', { params });
    return {
      data: response.data.data ?? [],
      meta: {
        current_page: response.data.current_page ?? 1,
        last_page: response.data.last_page ?? 1,
        per_page: response.data.per_page ?? 20,
        total: response.data.total ?? 0,
      },
    };
  }

  async update(
    productId: string,
    flags: { is_featured?: boolean; is_new?: boolean; is_bestseller?: boolean; is_on_sale?: boolean; is_visible_on_storefront?: boolean; hide_when_out_of_stock?: boolean; available_from?: string | null; available_until?: string | null }
  ): Promise<void> {
    await apiClient.post('/api/v1/ecommerce/products/flags/update', {
      product_id: productId,
      ...flags,
    });
  }

  async bulkUpdate(
    productIds: string[],
    flags: { is_featured?: boolean; is_new?: boolean; is_bestseller?: boolean; is_on_sale?: boolean; is_visible_on_storefront?: boolean; hide_when_out_of_stock?: boolean }
  ): Promise<number> {
    const response = await apiClient.post('/api/v1/ecommerce/products/flags/bulk-update', {
      product_ids: productIds,
      ...flags,
    });
    return response.data.data?.updated_count ?? 0;
  }
}

export default new ProductFlagsService();
