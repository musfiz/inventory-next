import axios from 'axios';
import apiClient from '@/lib/api/axios';
import type {
  User,
  RegisterUserRequest,
  RegisterUserResponse,
  UserListParams,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ApiResponse,
} from '@/types/api.types';

/**
 * User Service
 * Handles all user-related API calls
 */
class UserService {
  /**
   * Register a new user in a tenant
   * POST /api/auth/register
   */
  async registerUser(data: RegisterUserRequest): Promise<RegisterUserResponse> {
    const response = await axios.post<ApiResponse<RegisterUserResponse>>(
      '/api/auth/register',
      data
    );

    // Token is set as HTTP-only cookie by the Next.js API route
    return response.data.data;
  }

  /**
   * Get list of users in tenant
   * GET /api/v1/users
   */
  async getUsers(params?: UserListParams): Promise<UserListResponse> {
    const response = await apiClient.get<ApiResponse<UserListResponse>>('/api/v1/users', {
      params,
    });
    return response.data.data;
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(`/api/v1/users/${userId}`);
    return response.data.data.user;
  }

  /**
   * Create a new user (Admin only)
   * POST /api/v1/users
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/api/v1/users', data);
    return response.data.data.user;
  }

  /**
   * Update user details
   * PUT /api/v1/users/:id
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      `/api/v1/users/${userId}`,
      data
    );
    return response.data.data.user;
  }

  /**
   * Update the currently logged-in user profile
   * POST /api/v1/user/update
   */
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.email !== undefined) formData.append('email', data.email);
    if (data.phone !== undefined) formData.append('phone', data.phone);
    if (data.password) formData.append('password', data.password);
    if (data.password_confirmation) {
      formData.append('password_confirmation', data.password_confirmation);
    }
    if (data.avatar) formData.append('avatar', data.avatar);

    const response = await apiClient.post<ApiResponse<User>>('/api/v1/user/update', formData);

    return response.data.data;
  }

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${userId}`);
  }

  /**
   * Activate/Deactivate user
   * PATCH /api/v1/users/:id/status
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      `/api/v1/users/${userId}/status`,
      { is_active: isActive }
    );
    return response.data.data.user;
  }

  /**
   * Change user password
   * POST /api/v1/users/change-password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/v1/users/change-password', data);
  }

  /**
   * Reset password request
   * POST /api/v1/users/forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/api/v1/users/forgot-password', { email });
  }

  /**
   * Reset password
   * POST /api/v1/users/reset-password
   */
  async resetPassword(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiClient.post('/api/v1/users/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  /**
   * Get users by role
   * GET /api/v1/users/role/:role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<{ users: User[] }>>(
      `/api/v1/users/role/${role}`
    );
    return response.data.data.users;
  }

  /**
   * Bulk update users
   * POST /api/v1/users/bulk-update
   */
  async bulkUpdateUsers(userIds: string[], updates: Partial<UpdateUserRequest>): Promise<void> {
    await apiClient.post('/api/v1/users/bulk-update', {
      user_ids: userIds,
      updates,
    });
  }

  /**
   * Export users to CSV
   * GET /api/v1/users/export
   */
  async exportUsers(params?: UserListParams): Promise<Blob> {
    const response = await apiClient.get('/api/v1/users/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Switch to another user (Super Admin only)
   * POST /api/v1/switch-user/:userId
   */
  async switchUser(userId: string): Promise<{
    user: User;
    switched_from: { id: string; name: string; email: string };
    is_switched_user: boolean;
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        user: User;
        switched_from: { id: string; name: string; email: string };
        is_switched_user: boolean;
      }>
    >(`/api/v1/switch-user/${userId}`);
    return response.data.data;
  }

  /**
   * Switch back to super admin account
   * POST /api/v1/switch-back
   */
  async switchBack(): Promise<{
    user: User;
    switched_back_from: { id: string; name: string; email: string };
    is_switched_back: boolean;
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        user: User;
        switched_back_from: { id: string; name: string; email: string };
        is_switched_back: boolean;
      }>
    >('/api/v1/switch-back');
    return response.data.data;
  }
}

export const userService = new UserService();
export default userService;
