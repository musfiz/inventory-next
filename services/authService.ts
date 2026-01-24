import apiClient, { addAuthToken } from '@/lib/apiClient';

/**
 * Authentication Service
 * Handles all authentication-related API calls directly to Laravel backend
 */
class AuthService {
  /**
   * Login user with email and password
   */
  async login(email: string, password: string) {
    const { data } = await apiClient.post('/login', {
      email,
      password,
      device_name: 'inventory-ui',
    });
    
    // Store token in localStorage
    if (data.data.token) {
      localStorage.setItem('auth_token', data.data.token);
    }
    
    return data.data;
  }

  /**
   * Logout current user
   */
  async logout() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        await apiClient.post('/logout', {}, addAuthToken(token));
      } catch (error) {
        console.error('Logout API error:', error);
      }
    }
    // Clear token from localStorage
    localStorage.removeItem('auth_token');
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const { data } = await apiClient.get('/profile', addAuthToken(token));
    return data.data.user;
  }
  
  /**
   * Get auth token from storage
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
