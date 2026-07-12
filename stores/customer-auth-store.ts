'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomerUser, Address } from '@/types/storefront';
import { SAMPLE_ADDRESSES } from '@/lib/storefront/mock-data';

interface CustomerAuthState {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  addresses: Address[];
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<CustomerUser>) => void;
  addAddress: (address: Omit<Address, 'id'>) => void;
  updateAddress: (id: string, data: Partial<Address>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

const SAMPLE_USER: CustomerUser = {
  id: 'cu-1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+880 1712-345678',
};

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      addresses: [],

      login: async (email, _password) => {
        await new Promise(r => setTimeout(r, 600));
        if (email === 'demo@uims.shop' || email.includes('@')) {
          set({
            user: { ...SAMPLE_USER, email },
            isAuthenticated: true,
            addresses: SAMPLE_ADDRESSES,
          });
          return { ok: true };
        }
        return { ok: false, message: 'Invalid email or password' };
      },

      register: async (name, email, phone, _password) => {
        await new Promise(r => setTimeout(r, 700));
        set({
          user: { id: `cu-${Date.now()}`, name, email, phone },
          isAuthenticated: true,
          addresses: [],
        });
        return { ok: true };
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      updateProfile: data =>
        set(state => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      addAddress: address =>
        set(state => ({
          addresses: [
            ...state.addresses,
            { ...address, id: `a-${Date.now()}` },
          ],
        })),

      updateAddress: (id, data) =>
        set(state => ({
          addresses: state.addresses.map(a =>
            a.id === id ? { ...a, ...data } : a
          ),
        })),

      removeAddress: id =>
        set(state => ({
          addresses: state.addresses.filter(a => a.id !== id),
        })),

      setDefaultAddress: id =>
        set(state => ({
          addresses: state.addresses.map(a => ({
            ...a,
            isDefault: a.id === id,
          })),
        })),
    }),
    {
      name: 'uims-customer-auth',
    }
  )
);
