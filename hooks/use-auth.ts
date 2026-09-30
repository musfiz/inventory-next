import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import axios from '@/lib/api/axios';
import useAuthStore from '@/stores/auth-store';

interface UseAuthOptions {
  middleware?: string;
  redirectIfAuthenticated?: string;
}

export const useAuth = ({ middleware, redirectIfAuthenticated }: UseAuthOptions = {}) => {
  const router = useRouter();
  const params = useParams();
  const { setUser, clearAuth, setIsDemo } = useAuthStore();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    data: user,
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    '/api/v1/user',
    async () => {
      try {
        const res = await axios.get('/api/v1/user');
        setUser(res.data);
        // Backend adds `is_demo: true` to the user payload when demo mode is on.
        setIsDemo(Boolean((res.data as any)?.is_demo));
        return res.data;
      } catch (error: any) {
        if (error.response?.status === 401) {
          // Clear auth and redirect to login for protected routes
          clearAuth();
          if (middleware === 'auth' && !isRedirecting) {
            setIsRedirecting(true);
            router.push('/login');
          }
          return null; // Return null instead of undefined
        }
        if (error.response?.status === 409) {
          router.push('/verify-email');
          return null;
        }
        // For other errors, return null to prevent infinite loading
        console.error('Auth fetch error:', error);
        return null;
      }
    },
    {
      revalidateOnFocus: false, // Disable revalidation on tab focus to prevent duplicate requests
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      dedupingInterval: 2000, // Prevent duplicate requests within 2 seconds
    }
  );

  const csrf = async () => {
    await axios.get('/sanctum/csrf-cookie');
    // Small delay to ensure cookie is properly set by browser
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const register = async ({
    setErrors,
    ...props
  }: {
    setErrors: (errors: any) => void;
    [key: string]: any;
  }) => {
    await csrf();

    setErrors([]);

    axios
      .post('/api/v1/register', props)
      .then(() => mutate())
      .catch(error => {
        if (error.response.status !== 422) throw error;

        setErrors(error.response.data.errors);
      });
  };

  const login = async ({
    setErrors,
    ...props
  }: {
    setErrors: (errors: any) => void;
    [key: string]: any;
  }) => {
    await csrf();

    setErrors([]);

    axios
      .post('/api/v1/login', props)
      .then(() => mutate())
      .catch(error => {
        if (error.response.status !== 422) throw error;

        setErrors(error.response.data.errors);
      });
  };

  const demoLogin = async (
    userId: string,
    options?: { setErrors?: (errors: any) => void }
  ) => {
    await csrf();

    options?.setErrors?.([]);

    try {
      await axios.post('/api/v1/demo-login', { user_id: userId });
      await mutate();
      // Respect ?redirect= param when present, otherwise go to dashboard.
      // The guest-middleware effect also redirects, this is a fast-path.
      if (typeof window !== 'undefined') {
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        if (redirect && redirect.startsWith('/')) {
          router.push(redirect);
          return;
        }
        router.push('/dashboard');
      }
    } catch (error: any) {
      if (error?.response?.status === 422) {
        options?.setErrors?.(error.response.data.errors ?? error.response.data);
        return;
      }
      options?.setErrors?.(error?.response?.data ?? { message: 'Demo login failed' });
      throw error;
    }
  };

  const forgotPassword = async ({
    setErrors,
    setStatus,
    email,
  }: {
    setErrors: (errors: any) => void;
    setStatus: (status: any) => void;
    email: string;
  }) => {
    await csrf();

    setErrors([]);
    setStatus(null);

    axios
      .post('/api/v1/forgot-password', { email })
      .then(response => setStatus(response.data.status))
      .catch(error => {
        if (error.response.status !== 422) throw error;

        setErrors(error.response.data.errors);
      });
  };

  const resetPassword = async ({
    setErrors,
    setStatus,
    ...props
  }: {
    setErrors: (errors: any) => void;
    setStatus: (status: any) => void;
    [key: string]: any;
  }) => {
    await csrf();

    setErrors([]);
    setStatus(null);

    axios
      .post('/api/v1/reset-password', { token: params.token, ...props })
      .then(response => router.push('/login?reset=' + btoa(response.data.status)))
      .catch(error => {
        if (error.response.status !== 422) throw error;

        setErrors(error.response.data.errors);
      });
  };

  const resendEmailVerification = ({ setStatus }: { setStatus: (status: any) => void }) => {
    axios
      .post('/api/v1/email/verification-notification')
      .then(response => setStatus(response.data.status));
  };

  const logout = async () => {
    if (!error) {
      await axios.post('/api/v1/logout').then(() => mutate());
    }
    clearAuth();
    window.location.href = '/login';
  };

  useEffect(() => {
    if (middleware === 'guest' && redirectIfAuthenticated && user) {
      setIsRedirecting(true);
      router.push(redirectIfAuthenticated);
    }

    //if (middleware === 'auth' && (user && !user.email_verified_at))
    //router.push('/verify-email')

    if (
      window.location.pathname === '/verify-email' &&
      user?.email_verified_at &&
      redirectIfAuthenticated
    ) {
      setIsRedirecting(true);
      router.push(redirectIfAuthenticated);
    }

    if (middleware === 'auth' && error) {
      setIsRedirecting(true);
      logout();
    }
  }, [user, error]);

  return {
    user,
    register,
    login,
    demoLogin,
    forgotPassword,
    resetPassword,
    resendEmailVerification,
    logout,
    isRedirecting,
    isLoading: isLoading || isValidating,
  };
};
