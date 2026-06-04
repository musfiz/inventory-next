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

  /**
   * Upsert. The backend's `/sales-returns/store` endpoint accepts
   * both create and update — if `data.id` is present, it updates;
   * otherwise it creates. The page is responsible for setting
   * `data.id` when editing an existing return. There is no separate
   * `update()` method on purpose; one upsert endpoint is simpler
   * than a create+update pair and matches the backend contract.
   */
  async store(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<SalesReturn>>('/api/v1/sales-returns/store', data);
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

  async settlePayment(id: number | string, data: { action: string; amount: string | number; payment_method: string; notes?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/sales-returns/${id}/settle-payment`, data);
    return response.data;
  }
}

export default new SalesReturnService();
