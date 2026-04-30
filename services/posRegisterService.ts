import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PosRegister {
  id: string;
  uuid?: string;
  tenant_id?: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

class PosRegisterService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/registers', { params });
    return response.data;
  }

  async store(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosRegister>>('/api/v1/pos/registers/store', data);
    return response.data.data;
  }

  async destroy(id: string) {
    await apiClient.get(`/api/v1/pos/registers/delete/${id}`);
  }

  async dropdown() {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/registers/dropdown');
    return response.data.data;
  }
}

export default new PosRegisterService();
