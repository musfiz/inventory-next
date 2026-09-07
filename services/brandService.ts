import apiClient from '@/lib/api/axios';
import type { Brand, ApiResponse } from '@/types';

/**
 * Brand Service
 * Handles all brand-related API calls
 */
class BrandService {
  /**
   * Store a new brand or update existing brand
   * POST /api/v1/brand/store
   */
  async storeBrand(data: {
    id?: string;
    name: string;
    business_type_id?: number | null;
    description: string;
    is_active: boolean;
    logo_url?: File | null;
  }): Promise<Brand> {
    const formData = new FormData();

    if (data.id) formData.append('id', data.id);
    formData.append('name', data.name);
    if (data.business_type_id) formData.append('business_type_id', String(data.business_type_id));
    formData.append('description', data.description);
    formData.append('is_active', data.is_active ? '1' : '0');

    if (data.logo_url) {
      formData.append('logo_url', data.logo_url);
    }

    // Let axios automatically set Content-Type for FormData with proper boundary
    const response = await apiClient.post<ApiResponse<Brand>>('/api/v1/brand/store', formData);

    return response.data.data;
  }

  /**
   * Delete a brand
   * GET /api/v1/brand/{id}
   */
  async deleteBrand(id: string): Promise<void> {
    await apiClient.get(`/api/v1/brand/${id}`);
  }

  /**
   * Get brand by ID
   * GET /api/v1/brand/{id}
   */
  async getBrand(id: string): Promise<Brand> {
    const response = await apiClient.get<ApiResponse<Brand>>(`/api/v1/brand/${id}`);
    return response.data.data;
  }

  /**
   * Download brand sample Excel template
   * GET /api/v1/bulk-import/brands/sample-excel
   */
  async downloadBrandSampleExcel(): Promise<void> {
    const response = await apiClient.get('/api/v1/bulk-import/brands/sample-excel', {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brand_bulk_upload_template_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Bulk import brands from Excel file
   * POST /api/v1/bulk-import/brands
   */
  async brandBulkImport(file: File): Promise<{
    success: boolean;
    message: string;
    data?: {
      stats: {
        imported: number;
        skipped: number;
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

    const response = await apiClient.post('/api/v1/bulk-import/brands', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  }
}

// Create singleton instance
const brandService = new BrandService();
export default brandService;
