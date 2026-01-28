import { apiClient } from '@/lib/apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
  is_active: boolean;
  tenant_id: string | null;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    is_active: boolean;
  };
  roles?: string[];
  permissions?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

/**
 * Cookie-Based Authentication Service
 * 
 * Uses Laravel Sanctum's stateful authentication with HTTP-only cookies.
 * This is the industry-standard approach for SPA authentication:
 * 
 * 1. Client requests CSRF cookie from Laravel
 * 2. Client sends login credentials
 * 3. Laravel creates session and returns HTTP-only cookie
 * 4. All subsequent requests automatically include the cookie
 * 5. No tokens stored in localStorage/sessionStorage
 * 
 * Benefits:
 * - XSS protection (cookies are HTTP-only, not accessible via JavaScript)
 * - CSRF protection (via Sanctum's CSRF token)
 * - Automatic cookie management by browser
 * - Session-based, can be revoked server-side
 */
class AuthService {
  private readonly LARAVEL_BASE_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL?.replace('/api', '') || 'http://localhost:8000';

  /**
   * Initialize CSRF protection
   * Must be called before login or any state-changing request
   */
  async initCsrfProtection(): Promise<void> {
    try {
      await fetch(`${this.LARAVEL_BASE_URL}/sanctum/csrf-cookie`, {
        credentials: 'include', // Important: send/receive cookies
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to initialize CSRF protection:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   * Creates a session and returns user data
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Step 1: Get CSRF cookie
    await this.initCsrfProtection();

    // Step 2: Login (session cookie will be set automatically)
    const response = await apiClient.post<{ data: AuthResponse }>(
      '/v1/login',
      credentials
    );

    return response.data.data;
  }

  /**
   * Logout and destroy session
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/v1/logout');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, we should still redirect
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<{ data: { user: User } }>('/v1/profile');
      return response.data.data.user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * This is done by attempting to fetch the current user
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Verify session is valid (for middleware checks)
   */
  async verifySession(): Promise<boolean> {
    try {
      await apiClient.get('/v1/profile');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Switch to another user (Super Admin only)
   */
  async switchUser(userId: string): Promise<any> {
    // Refresh CSRF token before switching
    await this.initCsrfProtection();
    
    const response = await apiClient.post<{ data: any }>(
      `/v1/switch-user/${userId}`
    );
    
    // Refresh CSRF token after switching for subsequent requests
    await this.initCsrfProtection();
    
    return response.data.data;
  }

  /**
   * Switch back to super admin account
   */
  async switchBackToAdmin(superAdminId: string): Promise<any> {
    // Refresh CSRF token before switching back
    await this.initCsrfProtection();
    
    const response = await apiClient.post<{ data: any }>(
      '/v1/switch-back',
      { super_admin_id: superAdminId }
    );
    
    // Refresh CSRF token after switching back for subsequent requests
    await this.initCsrfProtection();
    
    return response.data.data;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
