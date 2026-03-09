import apiClient from '@/lib/api/axios';
import type {
  Category,
  Brand,
  Unit
} from '@/types/api.types';

class CommonService {
  /**
  * Get categories for dropdown (simplified)
  * GET /api/v1/categories/dropdown
  */
  async getCategoriesForDropdown(params?: {
    search?: string;
    only_parent?: boolean;
  }): Promise<Category[]> {
    const response = await apiClient.get<{
      data: Category[];
    }>('/api/v1/dropdown/category', {
      params,
    });
    return response.data.data;
  }

  /**
  * Get brands for dropdown (simplified)
  * GET /api/v1/dropdown/brand
  */
  async getBrandsForDropdown(params?: {
    search?: string;
  }): Promise<Brand[]> {
    const response = await apiClient.get<{
      data: Brand[];
    }>('/api/v1/dropdown/brand', {
      params,
    });
    return response.data.data;
  }

  /**
  * Get units for dropdown (simplified)
  * GET /api/v1/dropdown/unit
  */
  async getUnitsForDropdown(params?: {
    search?: string;
  }): Promise<Unit[]> {
    const response = await apiClient.get<{
      data: Unit[];
    }>('/api/v1/dropdown/unit', {
      params,
    });
    return response.data.data;
  }
}

export default new CommonService();