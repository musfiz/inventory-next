import apiClient from '@/lib/api/axios';
import { ApiResponse } from '@/types';

export interface EcommercePermission {
  id: string;
  name: string;
}

export interface EcommerceMenuPermissionData {
  user: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
  module: {
    id: string;
    name: string;
  };
  storefront_active: boolean;
  assigned_permissions: EcommercePermission[];
  unassigned_permissions: EcommercePermission[];
  all_permissions: EcommercePermission[];
}

export interface UserSelection {
  id: string;
  name: string;
  email: string;
  user_type: string;
}

class EcommerceMenuPermissionService {
  /**
   * Get ecommerce menu permissions for a user
   */
  async getPermissions(userId: string): Promise<EcommerceMenuPermissionData> {
    const response = await apiClient.get<ApiResponse<EcommerceMenuPermissionData>>(
      `/api/v1/ecommerce-menu-permissions/${userId}`
    );
    return response.data.data;
  }

  /**
   * Assign ecommerce menu permissions to a user
   */
  async assignPermissions(
    userId: string,
    permissions: string[]
  ): Promise<{ user: { id: string; name: string; email: string }; assigned_permissions: string[] }> {
    const response = await apiClient.post<ApiResponse<{ user: { id: string; name: string; email: string }; assigned_permissions: string[] }>>(
      '/api/v1/ecommerce-menu-permissions/assign',
      {
        user_id: userId,
        permissions,
      }
    );
    return response.data.data;
  }

  /**
   * Get all active users for selection
   */
  async getUsersForSelection(): Promise<UserSelection[]> {
    const response = await apiClient.get<ApiResponse<UserSelection[]>>(
      '/api/v1/user-permissions/users'
    );
    return response.data.data;
  }
}

export default new EcommerceMenuPermissionService();
