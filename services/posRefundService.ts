import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PosRefund {
  id: number;
  uuid?: string;
  refund_number?: string;
  refund_date?: string;
  refund_reason?: string;
  reason_details?: string;
  total_refund_amount?: number;
  refund_method?: string;
  status?: string;
  approved_by?: number;
  created_by?: number;
}

class PosRefundService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/refunds', { params });
    return response.data;
  }

  async store(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosRefund>>('/api/v1/pos/refunds/store', data);
    return response.data.data;
  }

  async destroy(id: number) {
    await apiClient.get(`/api/v1/pos/refunds/delete/${id}`);
  }

  async dropdown(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/refunds/dropdown', { params });
    return response.data.data;
  }
}

export default new PosRefundService();
