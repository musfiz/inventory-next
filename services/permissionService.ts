import apiClient from '@/lib/api/axios';
import { Permission, CreatePermissionRequest, UpdatePermissionRequest, Module } from '@/types';

class PermissionService {
  private baseUrl = '/api/v1/permissions';

  /**
   * Create a new permission
   */
  async storePermission(data: CreatePermissionRequest): Promise<Permission> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * Get a single permission by ID
   */
  async getPermission(id: string): Promise<Permission> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Update an existing permission
   */
  async updatePermission(id: string, data: UpdatePermissionRequest): Promise<Permission> {
    const response = await apiClient.post(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete a permission
   */
  async deletePermission(id: string): Promise<void> {
    await apiClient.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Get all modules
   */
  async getModules(): Promise<Module[]> {
    const response = await apiClient.get('/api/v1/user-permissions/all-modules');
    return response.data.data;
  }
}

export default new PermissionService();
