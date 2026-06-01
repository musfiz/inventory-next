import apiClient from '@/lib/api/axios';
import type { ApiResponse, SalesReturn } from '@/types/api.types';

class SalesReturnService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/sales-returns', { params });
    return response.data;
  }

  async show(id: number | string) {
    const response = await apiClient.get<ApiResponse<SalesReturn>>(`/api/v1/sales-returns/${id}`);
    return response.data.data;
  }

  async store(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<SalesReturn>>('/api/v1/sales-returns/store', data);
    return response.data.data;
  }

  async update(id: number | string, data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<SalesReturn>>('/api/v1/sales-returns/store', { ...data, id });
    return response.data.data;
  }

  async approve(id: number | string) {
    const response = await apiClient.post<ApiResponse<SalesReturn>>(`/api/v1/sales-returns/${id}/approve`);
    return response.data.data;
  }

  async complete(id: number | string) {
    const response = await apiClient.post<ApiResponse<SalesReturn>>(`/api/v1/sales-returns/${id}/complete`);
    return response.data.data;
  }

  async cancel(id: number | string) {
    const response = await apiClient.post<ApiResponse<SalesReturn>>(`/api/v1/sales-returns/${id}/cancel`);
    return response.data.data;
  }

  async destroy(id: number | string) {
    const response = await apiClient.get(`/api/v1/sales-returns/delete/${id}`);
    return response.data;
  }

  async getOrderReturns(salesOrderId: number | string) {
    const response = await apiClient.get<ApiResponse<SalesReturn[]>>(`/api/v1/sales-order/${salesOrderId}/returns`);
    return response.data.data;
  }
}

export default new SalesReturnService();
