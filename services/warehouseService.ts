import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface Warehouse {
  id: string;
  uuid: string;
  tenant_id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postal_code?: string;
  is_default: boolean;
  is_active: boolean;
  is_sales_location: boolean;
  is_purchase_location: boolean;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: string;
    business_name: string;
  };
}

/**
 * Warehouse Service
 * Handles all warehouse-related API calls
 */
class WarehouseService {
  /**
   * Store a new warehouse or update existing warehouse
   * POST /api/v1/warehouses/store
   */
  async storeWarehouse(data: {
    id?: string;
    tenant_id?: string;
    code: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    is_default?: boolean;
    is_active?: boolean;
    is_sales_location?: boolean;
    is_purchase_location?: boolean;
  }): Promise<Warehouse> {
    const response = await apiClient.post<ApiResponse<Warehouse>>('/api/v1/warehouses/store', data);
    return response.data.data;
  }

  /**
   * Delete warehouse
   * GET /api/v1/warehouses/delete/{id}
   */
  async deleteWarehouse(id: string): Promise<void> {
    await apiClient.get(`/api/v1/warehouses/delete/${id}`);
  }
}

export default new WarehouseService();
