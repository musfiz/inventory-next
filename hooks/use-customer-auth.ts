'use client';

import useSWR from 'swr';
import axios from '@/lib/api/axios';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';

interface UseCustomerAuthOptions {
  middleware?: 'auth' | 'guest';
  redirectIfAuthenticated?: string;
}

export const useCustomerAuth = ({ middleware, redirectIfAuthenticated }: UseCustomerAuthOptions = {}) => {
  const router = useRouter();
  const { setUser, clearAuth } = useCustomerAuthStore();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const redirectingRef = useRef(false);

  const {
    data: user,
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    middleware === 'auth' ? '/api/v1/storefront/auth/me' : null,
    async () => {
      const res = await axios.get('/api/v1/storefront/auth/me');
      setUser(res.data);
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      dedupingInterval: 2000,
      onError: (err: any) => {
        if (err.response?.status === 401) {
          clearAuth();
        }
      },
    }
  );

  useEffect(() => {
    if (redirectingRef.current || isRedirecting) return;

    if (middleware === 'guest' && redirectIfAuthenticated && user) {
      redirectingRef.current = true;
      setIsRedirecting(true);
      router.push(redirectIfAuthenticated);
    }

    if (middleware === 'auth' && error) {
      redirectingRef.current = true;
      setIsRedirecting(true);
      router.push('/store/account/login');
    }
  }, [user, error, middleware, redirectIfAuthenticated, router, isRedirecting]);

  return {
    user,
    isLoading: isLoading || isValidating,
    isRedirecting,
    mutate,
  };
};