import apiClient from '@/lib/api/axios';
import type { Attribute, ApiResponse } from '@/types';

/**
 * Attribute Service
 * Handles all attribute-related API calls
 */
class AttributeService {
  /**
   * Store a new attribute or update existing attribute
   * POST /api/v1/attribute/store
   */
  async storeAttribute(data: {
    id?: string;
    name: string;
    type: string;
    data_type: string;
    measurement_unit?: string;
    is_global: boolean;
    is_system: boolean;
    sort_order?: number;
    description: string;
  }): Promise<Attribute> {
    const response = await apiClient.post<ApiResponse<Attribute>>(
      '/api/v1/attribute/store',
      data
    );

    return response.data.data;
  }

  /**
   * Delete an attribute
   * GET /api/v1/attribute/{id}
   */
  async deleteAttribute(id: string): Promise<void> {
    await apiClient.get(`/api/v1/attribute/${id}`);
  }

  /**
   * Get attribute by ID
   * GET /api/v1/attribute/{id}
   */
  async getAttribute(id: string): Promise<Attribute> {
    const response = await apiClient.get<ApiResponse<Attribute>>(`/api/v1/attribute/${id}`);
    return response.data.data;
  }

  /**
   * Get all attributes
   * GET /api/v1/attribute
   */
  async getAllAttributes(): Promise<Attribute[]> {
    const response = await apiClient.get<ApiResponse<Attribute[]>>('/api/v1/attribute');
    return response.data.data;
  }

  /**
   * Search attributes by name with limit
   * GET /api/v1/attribute/search
   */
  async searchAttributes(search?: string, limit: number = 5): Promise<Attribute[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());

    const response = await apiClient.get<ApiResponse<Attribute[]>>(
      `/api/v1/attribute/search?${params.toString()}`
    );
    return response.data.data;
  }
}

// Create singleton instance
const attributeService = new AttributeService();
export default attributeService;