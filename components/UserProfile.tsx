'use client';

import { useAuth } from '@/hooks/useAuth';

/**
 * Example component showing Zustand auth store usage
 * This demonstrates accessing user data and auth state
 */
export default function UserProfile() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200">Not authenticated</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        User Profile
      </h2>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Name
          </label>
          <p className="text-gray-900 dark:text-gray-100">{user.name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Email
          </label>
          <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Role
          </label>
          <p className="text-gray-900 dark:text-gray-100 capitalize">
            {user.user_type}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            User Type
          </label>
          <p className="text-gray-900 dark:text-gray-100 capitalize">
            {user.user_type?.replace('_', ' ')}
          </p>
        </div>

        {user.phone && (
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Phone
            </label>
            <p className="text-gray-900 dark:text-gray-100">{user.phone}</p>
          </div>
        )}

        {user.tenant && (
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Business
            </label>
            <p className="text-gray-900 dark:text-gray-100">
              {user.tenant.business_name}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {isAdmin && (
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm">
              Admin
            </span>
          )}
          {/* {isTenantAdmin && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
              Tenant Admin
            </span>
          )} */}
        </div>

        <div className="pt-4">
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
