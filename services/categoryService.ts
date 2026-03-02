import apiClient from '@/lib/api/axios';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ApiResponse,
} from '@/types/api.types';

/**
 * Category Service
 * Handles all category-related API calls
 */
class CategoryService {
  /**
   * Get categories for dropdown (simplified)
   * GET /api/v1/categories/dropdown
   */
  async getCategoriesForDropdown(params?: {
    search?: string;
  }): Promise<Category[]> {
    const response = await apiClient.get<{
      data: Category[];
    }>('/api/v1/categories/dropdown', {
      params,
    });
    return response.data.data;
  }

  /**
   * Store a new category or update existing category
   * POST /api/v1/categories/store
   */
  async storeCategory(data: {
    id?: string;
    name: string;
    description?: string;
    parent_id?: string;
    business_type?: string;
    image_url?: string;
    sort_order?: number;
    is_active: boolean;
  }): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>('/api/v1/categories/store', data);
    return response.data.data;
  }

  /**
   * Delete category
   * GET /api/v1/categories/{id}
   */
  async deleteCategory(id: string): Promise<void> {
    await apiClient.get(`/api/v1/categories/delete/${id}`);
  }
}

export default new CategoryService();