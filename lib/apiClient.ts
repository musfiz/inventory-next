import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
export const addAuthToken = (token: string) => {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
};

export default apiClient;
