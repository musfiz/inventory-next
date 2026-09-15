import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface StockEntry {
  id?: string;
  uuid?: string;
  tenant_id?: string;
  product_id: string;
  variation_id: string;
  warehouse_id: string;
  purchase_order_no?: string | null;
  quantity?: number | string | null;
  reserved_quantity?: number | string | null;
  min_quantity?: number | string | null;
  max_quantity?: number | string | null;
  reorder_point?: number | string | null;
  average_cost?: number | string | null;
}

export interface StockMovementSummary {
  total: number;
  inbound: number;
  outbound: number;
  adjustment: number;
}

class StockService {
  async getStocks(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/stocks', { params });
    return response.data.data;
  }

  async getStockMovements(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/stocks/movements', { params });
    return response.data.data;
  }

  async getStockMovementsSummary(): Promise<StockMovementSummary> {
    const response = await apiClient.get<ApiResponse<StockMovementSummary>>('/api/v1/stocks/movements/summary');
    return response.data.data;
  }

  /**
   * Store stock entry (standalone, no PO).
   * POST /api/v1/stocks/store
   */
  async storeStocks(data: {
    tenant_id?: string;
    warehouse_id: string;
    product_id: string;
    stocks: StockEntry[];
  }) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/stocks/store', data);
    return response.data.data;
  }
}

export default new StockService();
