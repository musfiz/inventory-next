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
   * Store a new category or update existing category
   * POST /api/v1/categories/store
   */
  async storeCategory(data: {
    id?: string;
    name: string;
    description?: string;
    parent_id?: string | null;
    business_type_ids: number[];
    image_url?: string;
    sort_order?: number;
    is_active: boolean;
    storefront_active?: boolean;
  }): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>('/api/v1/categories/store', data);
    return response.data.data;
  }

  /**
   * Get single category by ID (fresh data for edit form).
   * GET /api/v1/categories/{id}
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await apiClient.get<ApiResponse<Category>>(`/api/v1/categories/${id}`);
    return response.data.data;
  }

  /**
   * Delete category
   * GET /api/v1/categories/{id}
   */
  async deleteCategory(id: string): Promise<void> {
    await apiClient.get(`/api/v1/categories/delete/${id}`);
  }

  /**
   * Download category sample Excel template
   * GET /api/v1/bulk-import/categories/sample-excel
   */
  async downloadCategorySampleExcel(): Promise<void> {
    const response = await apiClient.get('/api/v1/bulk-import/categories/sample-excel', {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `category_bulk_upload_template_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Bulk import categories from Excel file
   * POST /api/v1/bulk-import/categories
   */
  async categoryBulkImport(file: File): Promise<{
    success: boolean;
    message: string;
    data?: {
      stats: {
        imported: number;
        skipped: number;
        duplicates: number;
        duplicate_names: string[];
        total: number;
      };
      errors: Array<{
        row: number;
        attribute: string;
        errors: string[];
      }>;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/bulk-import/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  }

  /**
   * Download subcategory sample Excel template
   * GET /api/v1/bulk-import/categories/sub-category/sample-excel
   */
  async downloadSubCategorySampleExcel(): Promise<void> {
    const response = await apiClient.get('/api/v1/bulk-import/categories/sub-category/sample-excel', {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `subcategory_bulk_upload_template_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Bulk import subcategories from Excel file
   * POST /api/v1/bulk-import/categories/sub-category
   */
  async subCategoryBulkImport(file: File): Promise<{
    success: boolean;
    message: string;
    data?: {
      stats: {
        imported: number;
        skipped: number;
        duplicates: number;
        duplicate_names: string[];
        total: number;
      };
      errors: Array<{
        row: number;
        attribute: string;
        errors: string[];
      }>;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/bulk-import/categories/sub-category', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  }
}

export default new CategoryService();
