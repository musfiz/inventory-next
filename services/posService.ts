import apiClient from '@/lib/api/axios';

export interface PosOrderPayload {
  session_id: string | number;
  register_id: string | number;
  tenant_id?: string | number;
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
  payment_method: string;
  tendered_amount?: number;
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
  notes?: string;
  items: {
    variation_id: string | number;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate?: number;
  }[];
}

class PosService {
  /**
   * Get POS product variations from stock, optionally filtered by category / tenant
   * GET /api/v1/pos/products
   */
  async getProducts(params?: {
    search?: string;
    warehouse_id?: number;
    per_page?: number;
    category_id?: number;
    tenant_id?: string | number;
  }) {
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

  /**
   * Create a POS order
   * POST /api/v1/pos/orders
   */
  async createOrder(data: PosOrderPayload) {
    const response = await apiClient.post(`/api/v1/pos/orders`, data);
    return response.data.data;
  }
}

export default new PosService();
