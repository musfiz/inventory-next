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
    business_type: string;
    description: string;
    is_active: boolean;
    logo_url?: File | null;
  }): Promise<Brand> {
    const formData = new FormData();

    if (data.id) formData.append('id', data.id);
    formData.append('name', data.name);
    formData.append('business_type', data.business_type);
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
}

// Create singleton instance
const brandService = new BrandService();
export default brandService;
