import { useAuthStore } from '@/stores/authStore';
import { authService, type LoginCredentials } from '@/services/authService';

/**
 * Custom hook for authentication with cookie-based flow
 * No localStorage token management needed - all handled by HTTP-only cookies
 */
export const useAuth = () => {
  const { setUser, setLoading, setSwitchedUser, clearAuth } = useAuthStore();

  // Get state from store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isSwitchedUser = useAuthStore((state) => state.isSwitchedUser);
  const originalSuperAdmin = useAuthStore((state) => state.originalSuperAdmin);

  /**
   * Login with email and password
   * Session cookie is automatically set by Laravel
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const credentials: LoginCredentials = { email, password };
      const data = await authService.login(credentials);

      // Store user data in memory (store)
      setUser(data.user);

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user and destroy session
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear local state
      clearAuth();
    }
  };

  /**
   * Check and restore authentication from session cookie
   * Useful for page refreshes
   */
  const checkAuth = async (): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Try to get current user from session cookie
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        return true;
      }
      
      clearAuth();
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuth();
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get fresh user data from server
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  /**
   * Switch to another user (Super Admin only)
   */
  const switchUser = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await authService.switchUser(userId);

      // Store the switched user data
      setUser(data.user);

      // Mark as switched user and store original admin info
      if (data.switched_from) {
        setSwitchedUser(true, data.switched_from);
      }

      return true;
    } catch (error) {
      console.error('User switch failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch back to super admin account
   */
  const switchBackToAdmin = async (): Promise<boolean> => {
    try {
      setLoading(true);

      // Get the original super admin ID from state
      if (!originalSuperAdmin?.id) {
        console.error('No original super admin found in state');
        return false;
      }

      const data = await authService.switchBackToAdmin(originalSuperAdmin.id);

      // Store the super admin data
      setUser(data.user);

      // Clear switched user state
      setSwitchedUser(false, null);

      return true;
    } catch (error) {
      console.error('Switch back to admin failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isSwitchedUser,
    originalSuperAdmin,
    login,
    logout,
    checkAuth,
    refreshUser,
    switchUser,
    switchBackToAdmin,
  };
};
