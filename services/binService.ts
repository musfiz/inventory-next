import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface Bin {
  id: string;
  uuid: string;
  tenant_id: string;
  warehouse_id: string;
  name: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin_type?: 'storage' | 'picking' | 'receiving' | 'shipping' | 'quarantine';
  capacity?: number;
  current_occupancy?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: string;
    business_name: string;
  };
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
}

/**
 * Bin Service
 * Handles all bin-related API calls
 */
class BinService {
  /**
   * Store a new bin or update existing bin
   * POST /api/v1/bins/store
   */
  async storeBin(data: {
    id?: string;
    tenant_id?: string;
    warehouse_id: string;
    name: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin_type?: string;
    capacity?: number;
    current_occupancy?: number;
    is_active?: boolean;
  }): Promise<Bin> {
    const response = await apiClient.post<ApiResponse<Bin>>('/api/v1/bins/store', data);
    return response.data.data;
  }

  /**
   * Delete bin
   * GET /api/v1/bins/delete/{id}
   */
  async deleteBin(id: string): Promise<void> {
    await apiClient.get(`/api/v1/bins/delete/${id}`);
  }
}

export default new BinService();
