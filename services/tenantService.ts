import axios from 'axios';
import apiClient, { ApiResponse } from '@/lib/apiClient';
import type {
  RegisterTenantRequest,
  RegisterTenantResponse,
  Tenant,
  TenantDetailsResponse,
  TenantListResponse,
} from '@/types/api';

/**
 * Tenant Service
 * Handles all tenant-related API calls
 */
class TenantService {
  /**
   * Register a new tenant with admin user
   * POST /api/auth/register-tenant
   */
  async registerTenant(data: RegisterTenantRequest): Promise<RegisterTenantResponse> {
    const response = await axios.post<ApiResponse<RegisterTenantResponse>>(
      '/api/auth/register-tenant',
      data
    );
    
    // Token is set as HTTP-only cookie by the Next.js API route
    return response.data.data;
  }

  /**
   * Get all tenants (Super Admin only)
   * GET /tenants
   */
  async getTenants(page: number = 1, perPage: number = 10): Promise<TenantListResponse> {
    const response = await apiClient.get<ApiResponse<TenantListResponse>>(
      '/tenants',
      {
        params: { page, per_page: perPage },
      }
    );
    return response.data.data;
  }

  /**
   * Get tenant details by ID
   * GET /tenants/:id
   */
  async getTenantById(tenantId: string): Promise<TenantDetailsResponse> {
    const response = await apiClient.get<ApiResponse<TenantDetailsResponse>>(
      `/tenants/${tenantId}`
    );
    return response.data.data;
  }

  /**
   * Get current tenant details (for logged-in tenant users)
   * GET /tenant/current
   */
  async getCurrentTenant(): Promise<Tenant> {
    const response = await apiClient.get<ApiResponse<{ tenant: Tenant }>>(
      '/tenant/current'
    );
    return response.data.data.tenant;
  }

  /**
   * Update tenant details
   * PUT /tenants/:id
   */
  async updateTenant(
    tenantId: string,
    data: Partial<Omit<Tenant, 'id' | 'slug'>>
  ): Promise<Tenant> {
    const response = await apiClient.put<ApiResponse<{ tenant: Tenant }>>(
      `/tenants/${tenantId}`,
      data
    );
    return response.data.data.tenant;
  }

  /**
   * Activate/Deactivate tenant
   * PATCH /tenants/:id/status
   */
  async toggleTenantStatus(tenantId: string, isActive: boolean): Promise<Tenant> {
    const response = await apiClient.patch<ApiResponse<{ tenant: Tenant }>>(
      `/tenants/${tenantId}/status`,
      { is_active: isActive }
    );
    return response.data.data.tenant;
  }

  /**
   * Delete tenant (Super Admin only)
   * DELETE /tenants/:id
   */
  async deleteTenant(tenantId: string): Promise<void> {
    await apiClient.delete(`/tenants/${tenantId}`);
  }

  /**
   * Get tenant statistics
   * GET /tenants/:id/stats
   */
  async getTenantStats(tenantId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/stats`
    );
    return response.data.data;
  }
}

export const tenantService = new TenantService();
export default tenantService;
