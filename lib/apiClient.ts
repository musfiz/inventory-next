import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Laravel API URL - Direct connection with credentials
const LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000/api';

// Standard API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Axios client configured for Laravel Sanctum cookie-based authentication
 * 
 * Key configurations:
 * - withCredentials: true - Automatically sends cookies with every request
 * - baseURL points directly to Laravel API
 * - Handles CSRF token from Laravel
 * - No Authorization headers needed (cookies handle auth)
 */
export const apiClient = axios.create({
  baseURL: LARAVEL_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // Critical: enables cookie-based authentication
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Cookies are automatically sent with withCredentials: true
    // Laravel Sanctum handles the session cookie authentication
    
    // Add CSRF token from cookie if available (for state-changing requests)
    if (typeof document !== 'undefined') {
      const token = getCookie('XSRF-TOKEN');
      if (token) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
      }
    }

    // If sending FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;

      // Handle authentication errors
      if (status === 401) {
        // Session expired or invalid
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isPublicRoute = ['/login', '/register'].some(route => currentPath.startsWith(route));

          // Only redirect to login if not already on a public route
          if (!isPublicRoute) {
            // Preserve the current path for redirect after login
            const redirectPath = encodeURIComponent(currentPath);
            window.location.href = `/login?redirect=${redirectPath}`;
          }
        }
      }

      // Handle validation errors (422)
      if (status === 422 && data.errors) {
        const errorMessages = Object.values(data.errors).flat();
        throw new Error(errorMessages.join(', '));
      }

      // Handle other errors
      throw new Error(data.message || 'An error occurred');
    } else if (error.request) {
      // Network error
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

// Cookie utilities
export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

export default apiClient;
