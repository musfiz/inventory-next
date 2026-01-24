import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@/services/authService';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  user_type: string;
  tenant_id?: number;
  phone?: string;
  is_active: boolean;
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
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // State Actions (no API calls)
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  
  // Business Logic Actions (uses service layer)
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => set({ token }),
      
      setLoading: (loading) => set({ isLoading: loading }),

      clearAuth: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      }),

      // Business logic actions (uses service layer)
      login: async (email: string, password: string) => {
        try {
          const data = await authService.login(email, password);
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          get().clearAuth();
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const userData = await authService.getCurrentUser();
          set({
            user: userData,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          set({
            user: null,
            isAuthenticated: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
