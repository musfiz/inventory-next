import apiClient from '@/lib/api/axios';
import type { ApiResponse, Payment } from '@/types/api.types';

class PaymentService {
  /** GET /api/v1/payments — paginated list with the common filter set. */
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/payments', { params });
    return response.data;
  }

  /** GET /api/v1/payments/{id} */
  async show(id: number | string) {
    const response = await apiClient.get<ApiResponse<Payment>>(`/api/v1/payments/${id}`);
    return response.data.data;
  }

  /**
   * GET /api/v1/payments/uuid/{uuid} — keyed by uuid so the print URL is
   * stable (safe to email/print and reload).
   */
  async byUuid(uuid: string) {
    const response = await apiClient.get<ApiResponse<Payment>>(`/api/v1/payments/uuid/${uuid}`);
    return response.data.data;
  }
}

export default new PaymentService();
