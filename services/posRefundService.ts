import apiClient from '@/lib/api/axios';
import type { ApiResponse, PosOrderItemForRefund, PosRefundItem } from '@/types/api.types';

export interface PosRefund {
  id: number;
  uuid?: string;
  tenant_id?: number | string;
  pos_order_id?: number | string;
  refund_number?: string;
  refund_date?: string;
  refund_reason?: 'return' | 'damaged' | 'wrong_item' | 'customer_dissatisfaction' | 'expired' | 'exchange' | 'other';
  reason_details?: string | null;
  total_refund_amount?: number | string;
  refund_method?: 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'store_credit' | 'exchange';
  status?: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  approved_by?: number | string | null;
  approved_at?: string | null;
  created_by?: number | string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  pos_order?: { id: number | string; invoice_number?: string; order_number?: string; grand_total?: number | string; paid_amount?: number | string; returned_amount?: number | string; payment_status?: string } | null;
  items?: PosRefundItem[];
  approved_by_user?: { id: number | string; name: string } | null;
  created_by_user?: { id: number | string; name: string } | null;
}

class PosRefundService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/refunds', { params });
    return response.data;
  }

  async show(id: number | string) {
    const response = await apiClient.get<ApiResponse<PosRefund>>(`/api/v1/pos/refunds/${id}`);
    return response.data.data;
  }

  async store(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosRefund>>('/api/v1/pos/refunds/store', data);
    return response.data.data;
  }

  async update(id: number | string, data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosRefund>>('/api/v1/pos/refunds/store', { ...data, id });
    return response.data.data;
  }

  async approve(id: number | string) {
    const response = await apiClient.post<ApiResponse<PosRefund>>(`/api/v1/pos/refunds/${id}/approve`);
    return response.data.data;
  }

  async complete(id: number | string) {
    const response = await apiClient.post<ApiResponse<PosRefund>>(`/api/v1/pos/refunds/${id}/complete`);
    return response.data.data;
  }

  async destroy(id: number | string) {
    const response = await apiClient.get(`/api/v1/pos/refunds/delete/${id}`);
    return response.data;
  }

  /** Create a refund with dedicated item records in one step */
  async quickCreate(data: {
    pos_order_id: number | string;
    refund_reason: string;
    refund_method: string;
    reason_details?: string;
    tenant_id?: number | string;
    items: Array<{ variation_id: number | string; quantity: number }>;
  }) {
    const response = await apiClient.post<ApiResponse<PosRefund>>('/api/v1/pos/refunds/quick-create', data);
    return response.data.data;
  }

  /** Fetch items of a POS order for refund selection */
  async getOrderItems(orderId: number | string) {
    const response = await apiClient.get<ApiResponse<PosOrderItemForRefund[]>>(`/api/v1/pos/orders/${orderId}/items`);
    return response.data.data;
  }

  /** Settle payment after a completed refund (refund overpayment or collect remaining due) */
  async settlePayment(id: number | string, data: { action: string; amount: string | number; payment_method: string; notes?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/pos/refunds/${id}/settle-payment`, data);
    return response.data;
  }
}

export default new PosRefundService();
