import apiClient from '@/lib/api/axios';
import type { Unit, ApiResponse } from '@/types';

/**
 * Unit Service
 * Handles all unit-related API calls
 */
class UnitService {
  /**
   * Store a new unit or update existing unit
   * POST /api/v1/unit/store
   */
  async storeUnit(data: {
    id?: string;
    name: string;
    short_name: string;
    is_active: boolean;
  }): Promise<Unit> {
    const response = await apiClient.post<ApiResponse<Unit>>('/api/v1/unit/store', data);

    return response.data.data;
  }

  /**
   * Delete a unit
   * GET /api/v1/unit/{id}
   */
  async deleteUnit(id: string): Promise<void> {
    await apiClient.get(`/api/v1/unit/${id}`);
  }

  /**
   * Get unit by ID
   * GET /api/v1/unit/{id}
   */
  async getUnit(id: string): Promise<Unit> {
    const response = await apiClient.get<ApiResponse<Unit>>(`/api/v1/unit/${id}`);
    return response.data.data;
  }
}

// Create singleton instance
const unitService = new UnitService();
export default unitService;
