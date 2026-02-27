import apiClient from '@/lib/api/axios';
import type { TenantAttribute, ApiResponse } from '@/types';

/**
 * Tenant Attribute Service
 * Handles all tenant attribute-related API calls
 */
class TenantAttributeService {
  /**
   * Store a new tenant attribute or update existing tenant attribute
   * POST /api/v1/tenant-attribute/store
   */
  async storeTenantAttribute(data: {
    id?: string;
    attribute_id?: string;
    name: string;
    type: string;
    data_type?: string;
    measurement_unit?: string;
    is_required: boolean;
    is_filterable: boolean;
    is_variation_attribute: boolean;
    is_visible: boolean;
    sort_order?: number;
    validation_rules?: any;
    tenant_id?: string;
  }): Promise<TenantAttribute> {
    const response = await apiClient.post<ApiResponse<TenantAttribute>>(
      '/api/v1/tenant-attribute/store',
      data
    );

    return response.data.data;
  }

  /**
   * Delete a tenant attribute
   * GET /api/v1/tenant-attribute/{id}
   */
  async deleteTenantAttribute(id: string): Promise<void> {
    await apiClient.get(`/api/v1/tenant-attribute/${id}`);
  }

  /**
   * Get tenant attribute by ID
   * GET /api/v1/tenant-attribute/{id}
   */
  async getTenantAttribute(id: string): Promise<TenantAttribute> {
    const response = await apiClient.get<ApiResponse<TenantAttribute>>(`/api/v1/tenant-attribute/${id}`);
    return response.data.data;
  }

  /**
   * Get all tenant attributes
   * GET /api/v1/tenant-attribute
   */
  async getAllTenantAttributes(params?: {
    search?: string;
    per_page?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: TenantAttribute[]; current_page: number; last_page: number; per_page: number; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get<ApiResponse<TenantAttribute[]>>(
      `/api/v1/tenant-attribute?${searchParams.toString()}`
    );
    return response.data.data as any;
  }

  /**
   * Search tenant attributes by name with limit
   * GET /api/v1/tenant-attribute/search
   */
  async searchTenantAttributes(search?: string, limit: number = 5, tenantId?: string): Promise<TenantAttribute[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    if (tenantId) params.append('tenant_id', tenantId);

    const response = await apiClient.get<ApiResponse<TenantAttribute[]>>(
      `/api/v1/tenant-attribute/search?${params.toString()}`
    );
    return response.data.data;
  }
}

// Create singleton instance
const tenantAttributeService = new TenantAttributeService();
export default tenantAttributeService;