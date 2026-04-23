import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface Customer {
  id: number;
  uuid?: string;
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

  async getCustomersDropdown() {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/api/v1/customers/dropdown');
    return response.data.data;
  }

  async storeCustomer(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/customers', data);
    return response.data;
  }

  async updateCustomer(id: number, data: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<any>>(`/api/v1/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: number) {
    const response = await apiClient.delete<ApiResponse<any>>(`/api/v1/customers/${id}`);
    return response.data;
  }
}

export default new CustomerService();
