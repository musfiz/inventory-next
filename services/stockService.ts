import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface StockEntry {
  id?: string;
  uuid?: string;
  tenant_id?: string;
  product_id: string;
  variation_id: string;
  warehouse_id: string;
  quantity?: number | string | null;
  reserved_quantity?: number | string | null;
  min_quantity?: number | string | null;
  max_quantity?: number | string | null;
  reorder_point?: number | string | null;
  average_cost?: number | string | null;
}

class StockService {
  async getStocks(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/stocks', { params });
    return response.data.data;
  }

  async storeStocks(data: { tenant_id?: string; warehouse_id: string; product_id: string; stocks: StockEntry[] }) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/stocks/store', data);
    return response.data.data;
  }
}

export default new StockService();
