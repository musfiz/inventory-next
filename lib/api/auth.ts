/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */
import { AxiosResponse } from 'axios';
import apiClient from "./axios";
import { LoginCredentials } from "@/types/user.types";
import { LoginResponse, User } from "@/types";

/**
 * Initialize CSRF protection
 * Must be called before any state-changing requests
 * @returns Promise that resolves when CSRF cookie is set
 */
export async function initCSRF(): Promise<void> {
  await apiClient.get('/sanctum/csrf-cookie');
  // Small delay to ensure cookie is properly set by browser
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Login user with email and password
 * @param credentials - User login credentials
 * @returns Promise with user data
 */
export async function login(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  await initCSRF();

  const response: AxiosResponse<LoginResponse> = await apiClient.post(
    '/api/v1/login',
    credentials
  );

  return response.data;
}

/**
 * Register a new user
 * @param data - User registration data
 * @returns Promise with user data
 */
export async function register(data:any): Promise<LoginResponse> {
  // Get CSRF cookie first
  await initCSRF();

  const response: AxiosResponse<LoginResponse> = await apiClient.post(
    '/api/register',
    data
  );

  return response.data;
}

/**
 * Logout the current user
 * @returns Promise that resolves when logout is complete
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/v1/logout');

    // Clear any client-side cookies if needed
    // The server should handle cookie deletion, but we ensure cleanup
    if (typeof document !== 'undefined') {
      // Clear XSRF-TOKEN cookie from client side
      document.cookie =
        'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  } catch (error) {
    // Even if logout API fails, ensure client-side cleanup
    console.error('Logout API call failed:', error);
    throw error;
  }
}

/**
 * Get the authenticated user
 * @returns Promise with user data or null if not authenticated
 */
export async function getAuthUser(): Promise<User | null> {
  try {
    const response: AxiosResponse<User> = await apiClient.get('/api/v1/user/profile');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Send password reset link
 * @param email - User's email address
 * @returns Promise that resolves when email is sent
 */
export async function forgotPassword(
  email: string
): Promise<{ message: string }> {
  await initCSRF();

  const response: AxiosResponse<{ message: string }> = await apiClient.post(
    '/api/v1/forgot-password',
    { email }
  );

  return response.data;
}

/**
 * Reset password with token
 * @param data - Password reset data
 * @returns Promise that resolves when password is reset
 */
export async function resetPassword(data: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  await initCSRF();

  const response: AxiosResponse<{ message: string }> = await apiClient.post(
    '/api/v1/reset-password',
    data
  );

  return response.data;
}

/**
 * Verify email address
 * @param url - Verification URL from email
 * @returns Promise that resolves when email is verified
 */
export async function verifyEmail(url: string): Promise<{ message: string }> {
  const response: AxiosResponse<{ message: string }> = await apiClient.get(url);
  return response.data;
}

/**
 * Resend email verification link
 * @returns Promise that resolves when email is sent
 */
export async function resendVerification(): Promise<{ message: string }> {
  await initCSRF();

  const response: AxiosResponse<{ message: string }> = await apiClient.post(
    '/api/v1/email/verification-notification'
  );

  return response.data;
}

/**
 * Update user profile
 * @param data - User profile data
 * @returns Promise with updated user data
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
  await initCSRF();

  const response: AxiosResponse<User> = await apiClient.post(
    '/api/v1/user/profile',
    data
  );

  return response.data;
}

/**
 * Change user password
 * @param data - Password change data
 * @returns Promise that resolves when password is changed
 */
export async function changePassword(data: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  await initCSRF();

  const response: AxiosResponse<{ message: string }> = await apiClient.post(
    '/api/v1/user/password',
    data
  );

  return response.data;
}
