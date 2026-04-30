import apiClient from '@/lib/api/axios';

class PosService {
  /**
   * Get POS product variations from stock, optionally filtered by category
   * GET /api/v1/pos/products
   */
  async getProducts(params?: { search?: string; warehouse_id?: number; per_page?: number; category_id?: number }) {
    const response = await apiClient.get(`/api/v1/pos/products`, { params });
    return response.data.data;
  }

  /**
   * Get top-level categories (parent_id IS NULL) for POS category bar
   * GET /api/v1/pos/categories
   */
  async getCategories(): Promise<{ id: number; name: string; image_url?: string }[]> {
    const response = await apiClient.get(`/api/v1/pos/categories`);
    return response.data.data;
  }
}

export default new PosService();
