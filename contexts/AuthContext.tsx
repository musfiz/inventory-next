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
  const { user, isAuthenticated, checkAuth, login: storeLogin, logout: storeLogout } = useAuthStore();

  useEffect(() => {
    // Only check auth if not on a public route
    const isPublicRoute = PUBLIC_ROUTES.some(route => {
      // Exact match for root path
      if (route === '/') {
        return pathname === '/';
      }
      // startsWith for other routes
      return pathname?.startsWith(route);
    });
    
    if (!isPublicRoute) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const success = await storeLogin(email, password);
    if (success) {
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
