/**
 * Axios Configuration for Laravel Sanctum SPA Authentication
 * Centralized HTTP client with automatic CSRF handling
 */
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const XSRF_TOKEN_REGEX = /XSRF-TOKEN=([^;]+)/;

/**
 * Extract XSRF token from browser cookies
 * @returns Decoded XSRF token or null if not found
 */
function getXSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(XSRF_TOKEN_REGEX);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Create axios instance with Sanctum-specific configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: Send cookies with requests
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

/**
 * Request interceptor to inject CSRF token
 * Automatically adds X-XSRF-TOKEN header for state-changing requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for mutating requests
    const mutatingMethods = ['post', 'put', 'patch', 'delete'];
    if (
      config.method &&
      mutatingMethods.includes(config.method.toLowerCase())
    ) {
      const xsrfToken = getXSRFToken();
      if (xsrfToken) {
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for global error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common HTTP errors
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          // Unauthenticated - redirect to login only if not already on login page
          console.error('Unauthenticated. Session expired.');
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            // Clear auth and redirect to login
            const { useAuthStore } = require('@/stores/auth-store');
            useAuthStore.getState().clearAuth();
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
          break;
        case 403:
          console.error('Forbidden. You do not have permission.');
          break;
        case 419:
          // CSRF token mismatch - clear auth and redirect
          console.error('CSRF token mismatch. Please refresh and try again.');
          if (typeof window !== 'undefined') {
            const { useAuthStore } = require('@/stores/auth-store');
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
          }
          break;
        case 422:
          // Validation errors - handled by specific requests
          break;
        case 429:
          console.error('Too many requests. Please try again later.');
          break;
        case 500:
        case 502:
        case 503:
          console.error('Server error. Please try again later.');
          break;
        default:
          console.error(`Request failed with status ${status}`);
      }
    } else if (error.request) {
      console.error('No response received from server.');
    } else {
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
