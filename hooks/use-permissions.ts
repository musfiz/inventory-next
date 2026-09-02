import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Permission hook for checking user permissions
 *
 * Provides utilities for checking user permissions and roles.
 * Super admins automatically have all permissions.
 *
 * @example
 * const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermissions();
 *
 * if (hasPermission('create-users')) {
 *   // Show create user button
 * }
 */
export const usePermissions = () => {
  const { user, hydrated } = useAuthStore();

  // Check if user is super admin
  const isSuperAdmin = useMemo(() => user?.user_type === 'super_admin', [user?.user_type]);

  /**
   * Check if user has a specific permission
   * @param permission - Permission string to check (e.g., 'view-users', 'create-brands')
   * @returns true if user has permission or is super admin
   */
  const hasPermission = useMemo(
    () =>
      (permission: string): boolean => {
        // Wait for store to be hydrated
        if (!hydrated) return false;

        if (!user) return false;

        // Super admin has all permissions
        if (isSuperAdmin) return true;

        // Check if user has the specific permission
        return user.permissions?.includes(permission) ?? false;
      },
    [user, isSuperAdmin, hydrated]
  );

  /**
   * Check if user has any of the specified permissions
   * @param permissions - Array of permission strings
   * @returns true if user has at least one of the permissions or is super admin
   */
  const hasAnyPermission = useMemo(
    () =>
      (permissions: string[]): boolean => {
        // Wait for store to be hydrated
        if (!hydrated) return false;

        if (!user) return false;
        if (!permissions || permissions.length === 0) return false;

        // Super admin has all permissions
        if (isSuperAdmin) return true;

        // Check if user has any of the permissions
        return permissions.some(permission => user.permissions?.includes(permission) ?? false);
      },
    [user, isSuperAdmin, hydrated]
  );

  /**
   * Check if user has all of the specified permissions
   * @param permissions - Array of permission strings
   * @returns true if user has all permissions or is super admin
   */
  const hasAllPermissions = useMemo(
    () =>
      (permissions: string[]): boolean => {
        // Wait for store to be hydrated
        if (!hydrated) return false;

        if (!user) return false;
        if (!permissions || permissions.length === 0) return true;

        // Super admin has all permissions
        if (isSuperAdmin) return true;

        // Check if user has all permissions
        return permissions.every(permission => user.permissions?.includes(permission) ?? false);
      },
    [user, isSuperAdmin, hydrated]
  );

  /**
   * Check if user is a tenant admin
   */
  const isTenantAdmin = useMemo(() => user?.user_type === 'tenant_admin', [user?.user_type]);

  /**
   * Check if user is a tenant user
   */
  const isTenantUser = useMemo(() => user?.user_type === 'tenant_user', [user?.user_type]);

  /**
   * Check if the user's tenant has storefront active
   */
  const storefrontActive = useMemo(() => user?.tenant?.storefront_active ?? false, [user?.tenant?.storefront_active]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isTenantAdmin,
    isTenantUser,
    storefrontActive,
    permissions: user?.permissions ?? [],
    userType: user?.user_type,
    isAuthenticated: !!user,
    isHydrated: hydrated,
  };
};
