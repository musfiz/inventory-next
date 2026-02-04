import axios from '@/lib/api/axios';
import {
  Permission,
  PermissionListParams,
  PermissionListResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  ApiResponse
} from '@/types';

class PermissionService {
  private baseUrl = '/api/v1/permissions';

  /**
   * Get all permissions with pagination and filters
   */
  async getPermissions(params?: PermissionListParams): Promise<PermissionListResponse> {
    const response = await axios.get(this.baseUrl, { params });
    return response.data;
  }

  /**
   * Get a single permission by ID
   */
  async getPermission(id: string): Promise<Permission> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new permission
   */
  async createPermission(data: CreatePermissionRequest): Promise<Permission> {
    const response = await axios.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * Update an existing permission
   */
  async updatePermission(id: string, data: UpdatePermissionRequest): Promise<Permission> {
    const response = await axios.put(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete a permission
   */
  async deletePermission(id: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get all permissions without pagination (for dropdowns, etc.)
   */
  async getAllPermissions(): Promise<Permission[]> {
    const response = await axios.get(`${this.baseUrl}/all`);
    return response.data.data;
  }

  /**
   * Get permissions grouped by module
   */
  async getPermissionsByModule(): Promise<Record<string, Permission[]>> {
    const response = await axios.get(`${this.baseUrl}/by-module`);
    return response.data.data;
  }
}

export default new PermissionService();