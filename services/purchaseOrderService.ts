import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PurchaseOrder {
  id: number;
  uuid?: string;
  tenant_id?: string;
  po_number: string;
  supplier_id?: number;
  supplier?: any;
  warehouse_id?: number;
  warehouse?: any;
  order_date?: string;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  status?: string;
  total_amount?: number;
}

class PurchaseOrderService {
  async getPurchaseOrders(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/purchase-orders', { params });
    return response.data;
  }

  async getPurchaseOrderItems(purchaseOrderId: number) {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/purchase-orders/${purchaseOrderId}/items`
    );
    return response.data.data;
  }

  async storePurchaseOrder(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/purchase-orders/store', data);
    return response.data.data;
  }

  async deletePurchaseOrder(id: number) {
    await apiClient.post(`/api/v1/purchase-orders/delete/${id}`);
  }
}

export default new PurchaseOrderService();
