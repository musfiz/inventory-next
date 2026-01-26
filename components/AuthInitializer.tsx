'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

/**
 * AuthInitializer - Verifies and restores authentication on app load
 * This component runs once when the app initializes to check if user
 * has a valid session cookie and restore their auth state
 */
export function AuthInitializer() {
  const { checkAuth } = useAuth();
  const user = useAuthStore((state) => state.user);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const initAuth = async () => {
      // Only check auth if we have a stored user (from persistence)
      if (user) {
        setLoading(true);
        await checkAuth();
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, []); // Only run once on mount

  return null; // This component doesn't render anything
}
