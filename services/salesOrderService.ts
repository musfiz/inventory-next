import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface SalesOrder {
  id: number;
  uuid?: string;
  order_number: string;
  invoice_number?: string;
  customer_id?: number;
  customer?: any;
  warehouse_id?: number;
  warehouse?: any;
  order_date?: string;
  due_date?: string | null;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  sub_total?: number;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  tax_amount?: number;
  shipping_charge?: number;
  grand_total?: number;
  paid_amount?: number;
  shipping_method?: string;
  shipping_address?: string;
  notes?: string;
}

class SalesOrderService {
  async getSalesOrders(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/sales-order', { params });
    return response.data;
  }

  async getSalesOrderItems(salesOrderId: number) {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/sales-order/${salesOrderId}/items`
    );
    return response.data.data;
  }

  async getSalesOrder(salesOrderId: number) {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/sales-order/${salesOrderId}`
    );
    return response.data.data;
  }

  async storeSalesOrder(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/sales-order/store', data);
    return response.data.data;
  }

  async deleteSalesOrder(id: number) {
    await apiClient.get(`/api/v1/sales-order/delete/${id}`);
  }

  async updateSalesOrderFromDetails(id: number, data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/sales-order/${id}/update/details`, data);
    return response.data.data;
  }
}

export default new SalesOrderService();
