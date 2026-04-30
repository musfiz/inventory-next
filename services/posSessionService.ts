import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PosSession {
  id: string;
  uuid?: string;
  tenant_id?: string;
  register_id?: string;
  user_id?: string;
  session_number?: number;
  start_time?: string;
  end_time?: string | null;
  opening_balance?: string | number;
  closing_balance?: string | number | null;
  actual_cash?: string | number | null;
  status?: string;
  created_at?: string;
}

class PosSessionService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/sessions', { params });
    return response.data;
  }

  async open(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosSession>>('/api/v1/pos/sessions/open', data);
    return response.data.data;
  }

  async current() {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/sessions/current');
    return response.data.data;
  }

  async close(id: string, data?: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/pos/sessions/${id}/close`, data);
    return response.data.data;
  }

  async destroy(id: string) {
    await apiClient.delete(`/api/v1/pos/sessions/${id}`);
  }
}

export default new PosSessionService();
