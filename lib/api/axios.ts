import Axios from 'axios';

const axios = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
});

// Flag to track if CSRF cookie has been fetched
let csrfCookieFetched = false;

// Request interceptor to fetch CSRF cookie before POST requests
axios.interceptors.request.use(
  async config => {
    // Only fetch CSRF cookie for POST, PUT, PATCH, DELETE requests
    const methodsRequiringCsrf = ['post', 'put', 'patch', 'delete'];
    const method = config.method?.toLowerCase();

    if (method && methodsRequiringCsrf.includes(method) && !csrfCookieFetched) {
      try {
        // Fetch CSRF cookie
        await Axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sanctum/csrf-cookie`, {
          withCredentials: true,
        });
        csrfCookieFetched = true;
      } catch (error) {
        console.error('Failed to fetch CSRF cookie:', error);
      }
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 419 CSRF token mismatch and 403 permission errors
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If we get a 419 error (CSRF token mismatch), refetch the cookie and retry
    if (error.response?.status === 419 && !originalRequest._retry) {
      originalRequest._retry = true;
      csrfCookieFetched = false;

      try {
        // Refetch CSRF cookie
        await Axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sanctum/csrf-cookie`, {
          withCredentials: true,
        });
        csrfCookieFetched = true;

        // Retry the original request
        return axios(originalRequest);
      } catch (csrfError) {
        console.error('Failed to refresh CSRF cookie:', csrfError);
      }
    }

    // Handle 403 permission errors
    if (error.response?.status === 403) {
      // Redirect to access denied page if permission denied
      if (typeof window !== 'undefined') {
        window.location.href = '/access-denied';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axios;
