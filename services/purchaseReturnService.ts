import apiClient from '@/lib/api/axios';
import type {
  ApiResponse,
  PurchaseReturn,
  PurchaseReturnSettlement,
  ReturnableItemsResponse,
} from '@/types/api.types';

/**
 * Return to Vendor (purchase order return).
 *
 * `/purchase-returns/store` is an upsert — pass `id` to edit a pending return,
 * omit it to create one. There is deliberately no separate `update()`; one
 * endpoint matches the backend contract and mirrors salesReturnService.
 */
class PurchaseReturnService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<PurchaseReturn[]>>('/api/v1/purchase-returns', { params });
    return response.data;
  }

  async show(id: string | number) {
    const response = await apiClient.get<ApiResponse<PurchaseReturn>>(`/api/v1/purchase-returns/${id}`);
    return response.data.data;
  }

  async store(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PurchaseReturn>>('/api/v1/purchase-returns/store', data);
    return response.data.data;
  }

  async approve(id: string | number) {
    const response = await apiClient.post<ApiResponse<PurchaseReturn>>(`/api/v1/purchase-returns/${id}/approve`);
    return response.data.data;
  }

  /** Goods have physically left for the vendor. */
  async complete(id: string | number) {
    const response = await apiClient.post<ApiResponse<PurchaseReturn>>(`/api/v1/purchase-returns/${id}/complete`);
    return response.data.data;
  }

  async cancel(id: string | number) {
    const response = await apiClient.post<ApiResponse<PurchaseReturn>>(`/api/v1/purchase-returns/${id}/cancel`);
    return response.data.data;
  }

  /**
   * DELETE is the canonical route; the backend also keeps
   * `GET /purchase-returns/delete/{id}` because the rest of this codebase uses
   * GET for deletes. Try DELETE first and fall back, exactly as
   * salesReturnService does.
   */
  async destroy(id: string | number) {
    try {
      await apiClient.delete(`/api/v1/purchase-returns/${id}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        const response = await apiClient.get(`/api/v1/purchase-returns/delete/${id}`);
        return response.data;
      }
      throw err;
    }
  }

  async settle(
    id: string | number,
    data: {
      action: 'refund_received' | 'apply_to_payable';
      amount: string | number;
      payment_method: string;
      reference?: string;
      notes?: string;
    }
  ) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/purchase-returns/${id}/settle`, data);
    return response.data;
  }

  /** All returns raised against one purchase order. */
  async getOrderReturns(purchaseOrderId: string | number) {
    const response = await apiClient.get<ApiResponse<PurchaseReturn[]>>(
      `/api/v1/purchase-order/${purchaseOrderId}/returns`
    );
    return response.data.data;
  }

  /**
   * Per-line returnable quantities for a PO. Drives the return form's quantity
   * caps, so call this whenever the form opens or the PO changes.
   */
  async getReturnableItems(purchaseOrderId: string | number) {
    const response = await apiClient.get<ApiResponse<ReturnableItemsResponse>>(
      `/api/v1/purchase-order/${purchaseOrderId}/returnable-items`
    );
    return response.data.data;
  }
}

export default new PurchaseReturnService();
export type { PurchaseReturnSettlement };
