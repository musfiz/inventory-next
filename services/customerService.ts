import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface Customer {
  id: number;
  tenant_id: string;
  uuid?: string;
  name: string;
  phone?: string;
  email?: string;
  company_name?: string;
  contact_person?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  nid_number?: string;
  type?: 'retail' | 'wholesale' | 'corporate' | 'dealer';
  credit_limit?: number;
  current_balance?: number;
  status?: 'active' | 'inactive' | 'blacklisted';
}

class CustomerService {
  async getCustomers(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/customers', { params });
    return response.data;
  }

  async getCustomer(id: number) {
    const response = await apiClient.get<ApiResponse<Customer>>(`/api/v1/customers/${id}`);
    return response.data.data;
  }

  async storeCustomer(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/customers/store', data);
    return response.data;
  }

  async updateCustomer(id: number, data: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<any>>(`/api/v1/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: number) {
    const response = await apiClient.get<ApiResponse<any>>(`/api/v1/customers/delete/${id}`);
    return response.data;
  }

  async getCustomersDropdown(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/api/v1/customers', {
      params: { ...params, per_page: params?.per_page || 100 }
    });
    return response.data.data || [];
  }
}

export default new CustomerService();
