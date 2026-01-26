'use client';

import { useAuthStore } from '@/stores/authStore';

/**
 * Hook to access auth store
 * Use this in client components for direct access to auth state
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === 'admin' || user?.user_type === 'super_admin',
    isTenantAdmin: user?.user_type === 'tenant_admin',
    login,
    logout,
    checkAuth,
  };
};
