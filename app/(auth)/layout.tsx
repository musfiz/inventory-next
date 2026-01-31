'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from "@/stores/auth-store";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (isHydrated && isAuthenticated && user?.user_type) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, user, router]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="relative mb-4 inline-block">
            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render auth pages if already authenticated
  if (isAuthenticated && user?.user_type) {
    return null;
  }

  return <>{children}</>;
}
