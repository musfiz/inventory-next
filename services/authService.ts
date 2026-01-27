import axios from 'axios';
import apiClient, { ApiResponse, getCookie, deleteCookie, isAuthenticated as checkAuthCookie } from '@/lib/apiClient';
import type {
  LoginRequest,
  LoginResponse,
  UserProfileResponse,
} from '@/types/api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 * Uses HTTP-only cookies via Next.js API routes for secure token storage
 */
class AuthService {
  /**
   * Login user with email and password
   * POST /api/proxy/api/v1/login
   * Server sets HTTP-only cookie with auth token via proxy
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const loginData: LoginRequest = {
      email,
      password,
      device_name: 'inventory-ui',
    };

    const response = await axios.post<ApiResponse<LoginResponse>>(
      '/api/proxy/api/v1/login',
      loginData
    );

    // Token is set as HTTP-only cookie by the proxy route
    return response.data.data;
  }

  /**
   * Logout current user
   * POST /api/proxy/api/v1/logout
   * Server clears the HTTP-only cookie via proxy
   */
  async logout(): Promise<void> {
    try {
      await axios.post('/api/proxy/api/v1/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear any non-HTTP-only cookies if they exist
      deleteCookie('auth_token');
    }
  }

  /**
   * Get user profile with detailed information
   * GET /api/v1/profile
   */
  async getProfile(): Promise<UserProfileResponse> {
    const response = await apiClient.get<ApiResponse<UserProfileResponse>>('/api/v1/profile');
    return response.data.data;
  }

  /**
   * Get auth token from cookie (if not HTTP-only)
   * Note: HTTP-only cookies cannot be accessed via JavaScript
   */
  getToken(): string | null {
    return getCookie('auth_token');
  }

  /**
   * Check if user is authenticated
   * Note: This checks for non-HTTP-only cookie or makes an API call
   */
  isAuthenticated(): boolean {
    return checkAuthCookie();
  }

  /**
   * Refresh user session/token
   * POST /api/v1/refresh
   * Server updates the HTTP-only cookie
   */
  async refreshToken(): Promise<void> {
    await apiClient.post('/api/v1/refresh');
    // Server automatically updates the cookie
  }

  /**
   * Verify if current token is valid
   * GET /api/v1/verify-token
   */
  async verifyToken(): Promise<boolean> {
    try {
      await apiClient.get('/api/v1/verify-token');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request password reset
   * POST /api/v1/forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/api/v1/forgot-password', { email });
  }

  /**
   * Reset password with token
   * POST /api/v1/reset-password
   */
  async resetPassword(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiClient.post('/api/v1/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  /**
   * Update current user's password
   * POST /api/v1/change-password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiClient.post('/api/v1/change-password', {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: passwordConfirmation,
    });
  }

  /**
   * Switch to another user (Super Admin only)
   * POST /api/proxy/api/v1/switch-user/{userId}
   */
  async switchUser(userId: string): Promise<LoginResponse> {
    const response = await axios.post<ApiResponse<LoginResponse>>(
      `/api/proxy/api/v1/switch-user/${userId}`
    );

    return response.data.data;
  }

  /**
   * Switch back to super admin account
   * POST /api/proxy/api/v1/switch-back
   */
  async switchBackToAdmin(superAdminId: string): Promise<LoginResponse> {
    const response = await axios.post<ApiResponse<LoginResponse>>(
      '/api/proxy/api/v1/switch-back',
      { super_admin_id: superAdminId }
    );

    return response.data.data;
  }
}

export const authService = new AuthService();
export default authService;
