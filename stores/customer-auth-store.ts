'use client';

import { create } from 'zustand';
import axios from '@/lib/api/axios';
import type { CustomerUser } from '@/types/storefront';

interface CustomerAuthState {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  setUser: (user: CustomerUser | null) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string; errors?: Record<string, string[]> }>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<{ ok: boolean; message?: string; errors?: Record<string, string[]> }>;
  logout: () => Promise<void>;
  clearAuth: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>()((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (email, password) => {
    try {
      // Fetch CSRF cookie (handled by axios interceptor) then login
      await axios.get('/sanctum/csrf-cookie');

      const res = await axios.post('/api/v1/storefront/auth/login', {
        email,
        password,
      });

      set({
        user: res.data,
        isAuthenticated: true,
      });

      return { ok: true };
    } catch (error: any) {
      if (error.response?.status === 422) {
        return {
          ok: false,
          message: error.response.data.message || 'Validation failed',
          errors: error.response.data.errors,
        };
      }
      if (error.response?.status === 403) {
        return {
          ok: false,
          message: error.response.data.message || 'Your account has been deactivated.',
        };
      }
      return {
        ok: false,
        message: 'Unable to connect. Please try again.',
      };
    }
  },

  register: async (name, email, phone, password, passwordConfirmation) => {
    try {
      // Fetch CSRF cookie (handled by axios interceptor) then register
      await axios.get('/sanctum/csrf-cookie');

      const res = await axios.post('/api/v1/storefront/auth/register', {
        name,
        email,
        phone,
        password,
        password_confirmation: passwordConfirmation,
      });

      set({
        user: res.data,
        isAuthenticated: true,
      });

      return { ok: true };
    } catch (error: any) {
      if (error.response?.status === 422) {
        return {
          ok: false,
          message: error.response.data.message || 'Validation failed',
          errors: error.response.data.errors,
        };
      }
      return {
        ok: false,
        message: 'Unable to connect. Please try again.',
      };
    }
  },

  logout: async () => {
    try {
      await axios.post('/api/v1/storefront/auth/logout');
    } catch {
      // Proceed with clearing state even if API call fails
    }
    set({ user: null, isAuthenticated: false });
  },

  clearAuth: () => set({ user: null, isAuthenticated: false }),
}));
