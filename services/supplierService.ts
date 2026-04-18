import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface Supplier {
  id: string;
  uuid?: string;
  tenant_id?: string;
  code: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  vat_number?: string;
  tin_number?: string;
  trade_license?: string;
  credit_limit?: number;
  current_balance?: number;
  payment_terms?: string;
  status?: string;
}

class SupplierService {
  async getSuppliers(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/suppliers', { params });
    return response.data.data;
  }

  async storeSupplier(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/suppliers/store', data);
    return response.data.data;
  }

  async deleteSupplier(id: string) {
    await apiClient.get(`/api/v1/suppliers/delete/${id}`);
  }
}

export default new SupplierService();
