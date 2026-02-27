import apiClient from '@/lib/api/axios';
import type { TenantAttributeValue, ApiResponse } from '@/types';

/**
 * Tenant Attribute Value Service
 * Handles all tenant attribute value-related API calls
 */
class TenantAttributeValueService {
  /**
   * Store a new tenant attribute value or update existing tenant attribute value
   * POST /api/v1/tenant-attribute-value/store
   */
  async storeTenantAttributeValue(data: {
    id?: string;
    tenant_attribute_id: string;
    value: string;
    display_value?: string;
    hex_code?: string;
    sort_order?: number;
  }): Promise<TenantAttributeValue> {
    const response = await apiClient.post<ApiResponse<TenantAttributeValue>>(
      '/api/v1/tenant-attribute-value/store',
      data
    );

    return response.data.data;
  }

  /**
   * Delete a tenant attribute value
   * GET /api/v1/tenant-attribute-value/{id}
   */
  async deleteTenantAttributeValue(id: string): Promise<void> {
    await apiClient.get(`/api/v1/tenant-attribute-value/${id}`);
  }

  /**
   * Get tenant attribute value by ID
   * GET /api/v1/tenant-attribute-value/{id}
   */
  async getTenantAttributeValue(id: string): Promise<TenantAttributeValue> {
    const response = await apiClient.get<ApiResponse<TenantAttributeValue>>(`/api/v1/tenant-attribute-value/${id}`);
    return response.data.data;
  }

  /**
   * Get all tenant attribute values
   * GET /api/v1/tenant-attribute-value
   */
  async getAllTenantAttributeValues(params?: {
    search?: string;
    per_page?: number;
    sortBy?: string;
    sortOrder?: string;
    tenant_attribute_id?: string;
    tenant_id?: string;
  }): Promise<{ data: TenantAttributeValue[]; current_page: number; last_page: number; per_page: number; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (params?.tenant_attribute_id) searchParams.append('tenant_attribute_id', params.tenant_attribute_id);
    if (params?.tenant_id) searchParams.append('tenant_id', params.tenant_id);

    const response = await apiClient.get<ApiResponse<TenantAttributeValue[]>>(
      `/api/v1/tenant-attribute-value?${searchParams.toString()}`
    );
    return response.data.data as any;
  }

  /**
   * Search tenant attribute values by value with limit
   * GET /api/v1/tenant-attribute-value/search
   */
  async searchTenantAttributeValues(search?: string, limit: number = 5, tenantAttributeId?: string): Promise<TenantAttributeValue[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    if (tenantAttributeId) params.append('tenant_attribute_id', tenantAttributeId);

    const response = await apiClient.get<ApiResponse<TenantAttributeValue[]>>(
      `/api/v1/tenant-attribute-value/search?${params.toString()}`
    );
    return response.data.data;
  }
}

// Create singleton instance
const tenantAttributeValueService = new TenantAttributeValueService();
export default tenantAttributeValueService;