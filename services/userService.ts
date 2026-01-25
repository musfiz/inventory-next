import axios from 'axios';
import apiClient, { ApiResponse } from '@/lib/apiClient';
import type {
  User,
  RegisterUserRequest,
  RegisterUserResponse,
  UserListParams,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
} from '@/types/api';

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
   * GET /users
   */
  async getUsers(params?: UserListParams): Promise<UserListResponse> {
    const response = await apiClient.get<ApiResponse<UserListResponse>>(
      '/users',
      { params }
    );
    return response.data.data;
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(
      `/users/${userId}`
    );
    return response.data.data.user;
  }

  /**
   * Create a new user (Admin only)
   * POST /users
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>(
      '/users',
      data
    );
    return response.data.data.user;
  }

  /**
   * Update user details
   * PUT /users/:id
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      `/users/${userId}`,
      data
    );
    return response.data.data.user;
  }

  /**
   * Delete user
   * DELETE /users/:id
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  /**
   * Activate/Deactivate user
   * PATCH /users/:id/status
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      `/users/${userId}/status`,
      { is_active: isActive }
    );
    return response.data.data.user;
  }

  /**
   * Change user password
   * POST /users/change-password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/users/change-password', data);
  }

  /**
   * Reset password request
   * POST /users/forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/users/forgot-password', { email });
  }

  /**
   * Reset password
   * POST /users/reset-password
   */
  async resetPassword(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiClient.post('/users/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  /**
   * Get users by role
   * GET /users/role/:role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<{ users: User[] }>>(
      `/users/role/${role}`
    );
    return response.data.data.users;
  }

  /**
   * Bulk update users
   * POST /users/bulk-update
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: Partial<UpdateUserRequest>
  ): Promise<void> {
    await apiClient.post('/users/bulk-update', {
      user_ids: userIds,
      updates,
    });
  }

  /**
   * Export users to CSV
   * GET /users/export
   */
  async exportUsers(params?: UserListParams): Promise<Blob> {
    const response = await apiClient.get('/users/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
}

export const userService = new UserService();
export default userService;
