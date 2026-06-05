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
    // F-4 FIX: use DELETE (RESTful) instead of GET for the destructive
    // op. The backend's `GET .../delete/{id}` route is being
    // deprecated; the new canonical route is `DELETE /{id}`. Falls
    // back to the legacy GET only if the backend has not yet shipped
    // the new route.
    try {
      await apiClient.delete(`/api/v1/pos/registers/${id}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        await apiClient.get(`/api/v1/pos/registers/delete/${id}`);
      } else {
        throw err;
      }
    }
  }

  async dropdown(tenantId?: string | number) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/registers/dropdown', {
      params: tenantId ? { tenant_id: tenantId } : undefined,
    });
    return response.data.data;
  }
}

export default new PosRegisterService();
