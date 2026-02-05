import apiClient from '@/lib/api/axios';
import { ApiResponse } from '@/types';

export interface UserPermissionModule {
  module: string;
  permissions: {
    id: string;
    name: string;
    action: string;
  }[];
}

export interface UserPermissionData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  permissions: string[];
}

export interface UserSelection {
  id: string;
  name: string;
  email: string;
  user_type: string;
}

class UserPermissionService {
  /**
   * Get all permissions grouped by module
   */
  async getPermissionsByModule(): Promise<UserPermissionModule[]> {
    const response = await apiClient.get<ApiResponse<UserPermissionModule[]>>('/api/v1/user-permissions/modules');
    return response.data.data;
  }

  /**
   * Get all active users for selection
   */
  async getUsersForSelection(): Promise<UserSelection[]> {
    const response = await apiClient.get<ApiResponse<UserSelection[]>>('/api/v1/user-permissions/users');
    return response.data.data;
  }

  /**
   * Get user's assigned permissions
   */
  async getUserPermissions(userId: string): Promise<UserPermissionData> {
    const response = await apiClient.get<ApiResponse<UserPermissionData>>(`/api/v1/user-permissions/${userId}`);
    return response.data.data;
  }

  /**
   * Assign permissions to a user
   */
  async assignPermissions(userId: string, permissions: string[]): Promise<UserPermissionData> {
    const response = await apiClient.post<ApiResponse<UserPermissionData>>('/api/v1/user-permissions/assign', {
      user_id: userId,
      permissions
    });
    return response.data.data;
  }
}

export default new UserPermissionService();
