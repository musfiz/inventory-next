import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Use Next.js API routes as proxy to handle cookies securely
const API_URL = '/api/proxy';

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

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // Enable sending cookies with requests
});

// Request interceptor (cookies are sent automatically)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Cookies are automatically sent with withCredentials: true
    // No need to manually add Authorization header
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
        // Cookie expired or invalid
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isPublicRoute = ['/login', '/register'].some(route => currentPath.startsWith(route));
          
          // Only redirect to login if not already on a public route
          if (!isPublicRoute) {
            window.location.href = '/login';
          }
        }
        // Re-throw the error so calling code can handle it
        throw error;
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

// Cookie utilities (optional - cookies are handled by the browser)
export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

export const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// Check if user is authenticated by checking for auth cookie
export const isAuthenticated = (): boolean => {
  return !!getCookie('auth_token');
};

export default apiClient;
