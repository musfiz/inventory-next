import axios from 'axios';
import apiClient, { ApiResponse, getCookie, deleteCookie, isAuthenticated as checkAuthCookie } from '@/lib/apiClient';
import type {
  LoginRequest,
  LoginResponse,
  UserProfileResponse,
  User,
} from '@/types/api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 * Uses HTTP-only cookies via Next.js API routes for secure token storage
 */
class AuthService {
  /**
   * Login user with email and password
   * POST /api/auth/login
   * Server sets HTTP-only cookie with auth token
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const loginData: LoginRequest = {
      email,
      password,
      device_name: 'inventory-ui',
    };

    const response = await axios.post<ApiResponse<LoginResponse>>(
      '/api/auth/login',
      loginData
    );
    
    // Token is set as HTTP-only cookie by the Next.js API route
    return response.data.data;
  }

  /**
   * Logout current user
   * POST /api/auth/logout
   * Server clears the HTTP-only cookie
   */
  async logout(): Promise<void> {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear any non-HTTP-only cookies if they exist
      deleteCookie('auth_token');
    }
  }

  /**
   * Get current authenticated user
   * GET /user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/user');
    return response.data.data;
  }

  /**
   * Get user profile with detailed information
   * GET /profile
   */
  async getProfile(): Promise<UserProfileResponse> {
    const response = await apiClient.get<ApiResponse<UserProfileResponse>>('/profile');
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
   * POST /refresh
   * Server updates the HTTP-only cookie
   */
  async refreshToken(): Promise<void> {
    await apiClient.post('/refresh');
    // Server automatically updates the cookie
  }

  /**
   * Verify if current token is valid
   * GET /verify-token
   */
  async verifyToken(): Promise<boolean> {
    try {
      await apiClient.get('/verify-token');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request password reset
   * POST /forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/forgot-password', { email });
  }

  /**
   * Reset password with token
   * POST /reset-password
   */
  async resetPassword(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiClient.post('/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  /**
   * Update current user's password
   * POST /change-password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiClient.post('/change-password', {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: passwordConfirmation,
    });
  }

  /**
   * Update current user's profile
   * PUT /profile
   */
  async updateProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
  }): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>('/profile', data);
    return response.data.data.user;
  }
}

export const authService = new AuthService();
export default authService;
