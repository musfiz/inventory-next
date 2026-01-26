import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

/**
 * Custom hook for authentication business logic
 * Orchestrates service calls and store updates
 */
export const useAuth = () => {
  const { setUser, setToken, setLoading, clearAuth } = useAuthStore();

  /**
   * Login user with credentials
   * @param email - User email
   * @param password - User password
   * @returns Promise<boolean> - Success status
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await authService.login(email, password);
      
      // Store user data in authStore
      setUser(data.user);
      
      // Store token if provided (may be in HTTP-only cookie)
      if (data.token) {
        setToken(data.token);
      }
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuth();
    }
  };

  /**
   * Check and restore authentication from cookie
   * Useful for page refreshes to verify cookie-based auth
   */
  const checkAuth = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const { user } = useAuthStore.getState();
      
      // If user exists in store, verify with backend
      if (user) {
        try {
          const profile = await authService.getProfile();
          setUser(profile.user);
          return true;
        } catch (error) {
          // Cookie expired or invalid, clear auth
          clearAuth();
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    logout,
    checkAuth,
  };
};
