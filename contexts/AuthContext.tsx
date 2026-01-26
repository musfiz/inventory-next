'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContextType } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const storeLogin = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Only check auth once on initial mount (not on every route change)
    // Zustand will handle state persistence and restoration
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once on mount

  const login = async (email: string, password: string): Promise<boolean> => {
    const success = await storeLogin(email, password);
    if (success) {
      // After login, check auth to ensure fresh user data
      await checkAuth(true); // Force check after login
      router.push('/admin');
    }
    return success;
  };

  const logout = async () => {
    await storeLogout();
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
