import apiClient from '@/lib/api/axios';
import type { Payment, PosPaymentFields } from '@/types/api.types';

export interface PosOrderPayload extends PosPaymentFields {
  session_id: string | number;
  register_id: string | number;
  tenant_id?: string | number;
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
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

export interface PosOrderResponse {
  id: string;
  invoice_number: string;
  grand_total: number;
  payment_method: string;
  status: string;
  items?: unknown[];
}

export interface CreateOrderResult {
  order: PosOrderResponse;
  payment: Payment;
  balance_due: number;
  is_partial: boolean;
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
  async createOrder(data: PosOrderPayload): Promise<CreateOrderResult> {
    const response = await apiClient.post(`/api/v1/pos/orders`, data);
    return {
      order: response.data.data,
      payment: response.data.payment,
      balance_due: response.data.balance_due ?? 0,
      is_partial: response.data.is_partial ?? false,
    };
  }
}

export default new PosService();
