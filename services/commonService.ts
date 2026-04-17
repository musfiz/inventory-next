import apiClient from '@/lib/api/axios';
import type {
  Category,
  Brand,
  Unit,
  Tenant
} from '@/types/api.types';

class CommonService {
  /**
  * Get categories for dropdown (simplified)
  * GET /api/v1/dropdown/category
  */
  async getCategoriesForDropdown(params?: {
    search?: string;
    only_parent?: boolean;
    business_type?: string;
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
    business_type?: string;
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
  /**
  * Get units for dropdown (simplified)
  * GET /api/v1/dropdown/unit
  */
  async getProductsForDropdown(params?: {
    search?: string;
  }): Promise<Unit[]> {
    const response = await apiClient.get<{
      data: Unit[];
    }>('/api/v1/dropdown/product', {
      params,
    });
    return response.data.data;
  }

  /**
  * Get warehouses by tenant for dropdown (common endpoint)
  * GET /api/v1/dropdown/warehouse-by-tenant
  */
  async getWarehousesByTenant(params?: {
    search?: string;
    tenant_id?: string;
  }): Promise<any[]> {
    const response = await apiClient.get<{
      data: any[];
    }>('/api/v1/dropdown/warehouse-by-tenant', {
      params,
    });
    return response.data.data;
  }

  /**
  * Get tenants for dropdown (simplified) - Super admin only
  * GET /api/v1/dropdown/tenant
  */
  async getTenantsForDropdown(params?: {
    search?: string;
  }): Promise<Tenant[]> {
    const response = await apiClient.get<{
      data: Tenant[];
    }>('/api/v1/dropdown/tenant', {
      params,
    });
    return response.data.data;
  }


  /**
   * Get product variations for a product
   * GET /api/v1/product/{id}/variant
   */
  async getVariationsByProduct(productId: string, params?: { search?: string }): Promise<any[]> {
    const response = await apiClient.get<{
      data: any[];
    }>(`/api/v1/product/${productId}/variant`, {
      params,
    });
    return response.data.data;
  }
}

export default new CommonService();