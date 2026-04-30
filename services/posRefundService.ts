import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PosRefund {
  id: number;
  uuid?: string;
  tenant_id?: number | string;
  original_order_id?: number | string;
  refund_order_id?: number | string | null;
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
  original_order?: { id: number | string; order_number: string };
  refund_order?: { id: number | string; order_number: string } | null;
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
}

export default new PosRefundService();
