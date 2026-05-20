import apiClient from '@/lib/api/axios';
import type { Module, ApiResponse } from '@/types';

/**
 * Module Service
 * Handles all module-related API calls
 */
class ModuleService {
  /**
   * Store a new module or update existing module
   * POST /api/v1/module/store
   */
  async storeModule(data: {
    id?: string;
    name: string;
  }): Promise<Module> {
    const response = await apiClient.post<ApiResponse<Module>>('/api/v1/module/store', data);

    return response.data.data;
  }

  /**
   * Delete a module
   * GET /api/v1/module/{id}
   */
  async deleteModule(id: string): Promise<void> {
    await apiClient.get(`/api/v1/module/${id}`);
  }
}

// Create singleton instance
const moduleService = new ModuleService();
export default moduleService;