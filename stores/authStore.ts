import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
  tenant_id?: string;
  phone?: string;
  is_active: boolean;
  avatar_url?: string;
  last_login_at: string;
  tenant?: {
    id: number;
    business_name: string;
    slug: string;
    email: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  // State Actions (no API calls)
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      isHydrated: false,

      setUser: (user) => set({ user }),

      setToken: (token) => set({ token }),

      setLoading: (loading) => set({ isLoading: loading }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      clearAuth: () => set({
        user: null,
        token: null,
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
