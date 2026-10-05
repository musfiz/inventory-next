import apiClient from '@/lib/api/axios';
import type { ApiResponse, BulkImportResult } from '@/types/api.types';

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
  notes?: string;
  city?: string;
  state?: string;
  country?: string;
  nid_number?: string;
  type?: 'own' | 'retail' | 'wholesale' | 'corporate' | 'dealer';
  credit_limit?: number;
  current_balance?: number;
  outstanding_balance?: number;
  status?: 'active' | 'inactive' | 'blacklisted';
}

// Bulk import payload types live in @/types/api.types — they are shared with
// supplierService and every other /bulk-import/* caller.
export type { BulkImportResult, BulkImportRowError, BulkImportStats } from '@/types/api.types';

export interface CustomerStatementOrder {
  id: number;
  invoice_number?: string;
  order_date?: string;
  grand_total?: number;
  paid_amount?: number;
  returned_amount?: number;
  due_amount?: number;
  payment_status?: string;
}

export interface CustomerStatementResponse {
  customer: Customer;
  summary: {
    total_outstanding: number;
    orders_count: number;
  };
  orders: {
    data: CustomerStatementOrder[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
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

  async getCustomerStatement(id: number, params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<CustomerStatementResponse>>(`/api/v1/customers/${id}/statement`, { params });
    return response.data.data;
  }

  async recordCustomerPayment(id: number, data: { amount: number | string; payment_method: string; notes?: string; payment_date?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/customers/${id}/record-payment`, data);
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

  async getCustomersDropdown(params?: Record<string, any>, options?: { signal?: AbortSignal }) {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/api/v1/customers', {
      params: { ...params, per_page: params?.per_page || 100 },
      signal: options?.signal,
    });
    return response.data.data || [];
  }

  /**
   * Download customer sample Excel template
   * GET /api/v1/bulk-import/customers/sample-excel
   *
   * Two columns only — Name and Mobile No. tenantId is optional and only read
   * by the API for super admins; everyone else gets their own tenant.
   */
  async downloadCustomerSampleExcel(tenantId?: string | null): Promise<void> {
    const response = await apiClient.get('/api/v1/bulk-import/customers/sample-excel', {
      params: tenantId ? { tenant_id: tenantId } : undefined,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customer_bulk_upload_template_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Bulk import customers from an Excel or CSV file
   * POST /api/v1/bulk-import/customers
   *
   * Rejects with a 422 whose body is `{ message, errors: BulkImportRowError[] }`
   * when spreadsheet rows fail validation, so the caller must read errors off
   * the axios error rather than the resolved value.
   */
  async customerBulkImport(file: File, tenantId?: string | null): Promise<BulkImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (tenantId) formData.append('tenant_id', tenantId);

    const response = await apiClient.post<BulkImportResult>('/api/v1/bulk-import/customers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  }
}

export default new CustomerService();
