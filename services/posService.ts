import apiClient from '@/lib/api/axios';
import type { Payment, PosHeldOrder, PosHoldPayload, PosOrderDetail, PosOrderListItem, PosPaymentFields } from '@/types/api.types';

export interface PosOrderPayload extends PosPaymentFields {
  session_id: string | number;
  register_id: string | number;
  tenant_id?: string | number;
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
  discount_type?: 'percentage' | 'fixed';
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

  /**
   * Get paginated POS orders list
   * GET /api/v1/pos/orders
   */
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    tenant_id?: string | number;
    session_id?: string | number;
    register_id?: string | number;
    payment_status?: string;
    payment_method?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<{ data: PosOrderListItem[]; total: number; current_page: number; last_page: number }> {
    const response = await apiClient.get(`/api/v1/pos/orders`, { params });
    const page = response.data.data;
    return {
      data: page.data ?? [],
      total: page.total ?? 0,
      current_page: page.current_page ?? 1,
      last_page: page.last_page ?? 1,
    };
  }

  // ─── Hold Orders ─────────────────────────────────────────────────────────────

  /** Save current cart as a hold order */
  async holdOrder(data: PosHoldPayload): Promise<{ id: number; hold_number: string }> {
    const response = await apiClient.post(`/api/v1/pos/hold-orders`, data);
    return response.data.data;
  }

  /** List active hold orders for a session */
  async getHeldOrders(params?: { session_id?: string | number; register_id?: string | number }): Promise<PosHeldOrder[]> {
    const response = await apiClient.get(`/api/v1/pos/hold-orders`, { params });
    return response.data.data ?? [];
  }

  /** Restore a hold order — returns order_data */
  async restoreHeldOrder(id: number): Promise<PosHoldPayload['order_data']> {
    const response = await apiClient.post(`/api/v1/pos/hold-orders/${id}/restore`);
    return response.data.data;
  }

  /** Cancel a hold order */
  async cancelHeldOrder(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/pos/hold-orders/${id}`);
  }

  // ─── Order Detail ─────────────────────────────────────────────────────────────

  /**
   * Get a single POS order with full details (items, payments, session, register, customer)
   * GET /api/v1/pos/orders/{uuid}
   */
  async getPosOrder(uuid: string): Promise<PosOrderDetail> {
    const response = await apiClient.get(`/api/v1/pos/orders/${uuid}`);
    return response.data.data;
  }

  /**
   * Record a partial/due payment against a POS order
   * POST /api/v1/pos/orders/{uuid}/record-payment
   */
  async recordDuePayment(uuid: string, data: {
    amount: number;
    payment_method: string;
    notes?: string;
  }): Promise<PosOrderDetail> {
    const response = await apiClient.post(`/api/v1/pos/orders/${uuid}/record-payment`, data);
    return response.data.data;
  }
}

export default new PosService();
