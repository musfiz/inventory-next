import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  loading: boolean;
  isSwitchedUser: boolean;
  originalSuperAdmin: User | null;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  switchUser: (targetUser: User, originalAdmin: User) => void;
  switchBack: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      loading: false,
      isSwitchedUser: false,
      originalSuperAdmin: null,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, isSwitchedUser: false, originalSuperAdmin: null }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ loading }),
      clearAuth: () => set({ user: null, isAuthenticated: false, isSwitchedUser: false, originalSuperAdmin: null }),
      switchUser: (targetUser, originalAdmin) => set({ 
        user: targetUser, 
        isAuthenticated: true,
        isSwitchedUser: true,
        originalSuperAdmin: originalAdmin
      }),
      switchBack: () => set((state) => ({
        user: state.originalSuperAdmin,
        isAuthenticated: true,
        isSwitchedUser: false,
        originalSuperAdmin: null
      })),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

export default useAuthStore;
