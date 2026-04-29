import apiClient from '@/lib/api/axios';

class PosService {
  /**
   * Get POS product variations
   * GET /api/v1/pos/products
   */
  async getProducts(params?: { search?: string; warehouse_id?: number; per_page?: number }) {
    const response = await apiClient.get(`/api/v1/pos/products`, { params });
    return response.data.data;
  }
}

export default new PosService();
