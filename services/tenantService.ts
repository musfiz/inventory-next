import axios from 'axios';
import apiClient from '@/lib/api/axios';
import type {
  RegisterTenantRequest,
  RegisterTenantResponse,
  Tenant,
  TenantDetailsResponse,
  TenantListResponse,
  ApiResponse,
} from '@/types/api.types';

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
   * GET /api/v1/tenants
   */
  async getTenants(page: number = 1, perPage: number = 10): Promise<TenantListResponse> {
    const response = await apiClient.get<ApiResponse<TenantListResponse>>('/api/v1/tenants', {
      params: { page, per_page: perPage },
    });
    return response.data.data;
  }

  /**
   * Search tenants (Super Admin only)
   * GET /api/v1/tenant/search
   */
  async searchTenants(name: string = ''): Promise<Tenant[]> {
    const response = await apiClient.get('/api/v1/tenant/search');
    // Handle both response formats: direct array or {success, message, data}
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  }

  /**
   * Get tenant details by ID
   * GET /api/v1/tenants/edit/:id
   */
  async getTenantById(tenantId: string): Promise<TenantDetailsResponse> {
    const response = await apiClient.get<ApiResponse<TenantDetailsResponse>>(
      `/api/v1/tenants/edit/${tenantId}`
    );
    return response.data.data;
  }

  /**
   * Store a new tenant (Super Admin only)
   * POST /api/v1/tenants/store
   */
  async storeTenant(data: Partial<Tenant>): Promise<Tenant> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/tenants/store',
      data
    );
    return (response.data.data as any).tenant ?? (response.data.data as Tenant);
  }

  /**
   * Get current tenant details (for logged-in tenant users)
   * GET /api/v1/tenant/current
   */
  async getCurrentTenant(): Promise<Tenant> {
    const response = await apiClient.get<ApiResponse<{ tenant: Tenant }>>('/api/v1/tenant/current');
    return response.data.data.tenant;
  }

  /**
   * Update tenant details
   * POST /api/v1/tenants/update  — id included in body
   */
  async updateTenant(
    tenantId: string,
    data: Partial<Omit<Tenant, 'id' | 'slug'>>
  ): Promise<Tenant> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/tenants/update',
      { ...data, id: tenantId }
    );
    return (response.data.data as any).tenant ?? (response.data.data as Tenant);
  }

  /**
   * Activate/Deactivate tenant
   * PATCH /api/v1/tenants/:id/status
   */
  async toggleTenantStatus(tenantId: string, isActive: boolean): Promise<Tenant> {
    const response = await apiClient.patch<ApiResponse<{ tenant: Tenant }>>(
      `/api/v1/tenants/${tenantId}/status`,
      { is_active: isActive }
    );
    return response.data.data.tenant;
  }

  /**
   * Delete tenant (Super Admin only)
   * DELETE /api/v1/tenants/:id
   */
  async deleteTenant(tenantId: string): Promise<void> {
    await apiClient.delete(`/api/v1/tenants/${tenantId}`);
  }

  /**
   * Get tenant statistics
   * GET /api/v1/tenants/:id/stats
   */
  async getTenantStats(tenantId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/api/v1/tenants/${tenantId}/stats`);
    return response.data.data;
  }

  /**
   * Get tenant settings
   * GET /api/v1/tenants/:id/settings
   */
  async getTenantSettings(tenantId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/api/v1/tenants/${tenantId}/settings`);
    return response.data.data;
  }

  /**
   * Update tenant settings
   * POST /api/v1/tenants/:id/settings
   */
  async updateTenantSettings(tenantId: string, data: any): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/tenants/${tenantId}/settings`,
      data
    );
    return response.data.data;
  }
}

export const tenantService = new TenantService();
export default tenantService;
