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

  /**
   * GET /api/v1/payments/{id}/receipt — full receipt payload (payment
   * + linked order + line items) in a single round-trip. Use this from
   * the A4 / thermal print menu instead of `show` + a follow-up
   * `getPosOrder` / `getSalesOrder` fetch.
   *
   * The optional `referenceType` hint tells the backend which order
   * relation this payment is attached to (pos / sale / etc.) so it can
   * pull the correct set of line items. Without it the backend falls
   * back to whichever FK (`pos_order_id` / `sales_order_id`) is set.
   *
   * The dedicated `/receipt` endpoint is not deployed on every backend
   * yet, so we transparently fall back to `show` on 404. `show` already
   * returns the payment with its `tenant`, `salesOrder` and `posOrder`
   * relations, which is enough for the print menu to render.
   */
  async receipt(id: number | string, referenceType?: string): Promise<Payment> {
    try {
      const response = await apiClient.get<ApiResponse<Payment>>(
        `/api/v1/payments/${id}/receipt`,
        { params: referenceType ? { reference_type: referenceType } : undefined },
      );
      return response.data.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return this.show(id);
      }
      throw err;
    }
  }

  /** GET /api/v1/payments/uuid/{uuid}/receipt — receipt keyed by uuid. */
  async receiptByUuid(uuid: string, referenceType?: string): Promise<Payment> {
    try {
      const response = await apiClient.get<ApiResponse<Payment>>(
        `/api/v1/payments/uuid/${uuid}/receipt`,
        { params: referenceType ? { reference_type: referenceType } : undefined },
      );
      return response.data.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return this.byUuid(uuid);
      }
      throw err;
    }
  }
}

export default new PaymentService();
