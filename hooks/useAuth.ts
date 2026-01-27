import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

/**
 * Custom hook for authentication business logic
 * Orchestrates service calls and store updates
 */
export const useAuth = () => {
  const { setUser, setLoading, setSwitchedUser, clearAuth } = useAuthStore();

  // Get state from store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const isSwitchedUser = useAuthStore((state) => state.isSwitchedUser);
  const originalSuperAdmin = useAuthStore((state) => state.originalSuperAdmin);
  const isAdmin = user?.user_type === 'admin' || user?.user_type === 'super-admin';
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await authService.login(email, password);

      // Store user data in authStore
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

  /**
   * Switch to another user (Super Admin only)
   * @param userId - Target user ID to switch to
   * @returns Promise<boolean> - Success status
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
   * @returns Promise<boolean> - Success status
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
    // State
    user,
    isAuthenticated,
    isAdmin,
    isSwitchedUser,
    originalSuperAdmin,

    // Methods
    login,
    logout,
    checkAuth,
    switchUser,
    switchBackToAdmin,
  };
};
