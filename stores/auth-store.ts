import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
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
      loading: false,
      isSwitchedUser: false,
      originalSuperAdmin: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null, isSwitchedUser: false, originalSuperAdmin: null }),
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      clearAuth: () => set({ user: null, isSwitchedUser: false, originalSuperAdmin: null }),
      switchUser: (targetUser, originalAdmin) => set({
        user: targetUser,
        isSwitchedUser: true,
        originalSuperAdmin: originalAdmin
      }),
      switchBack: () => set((state) => ({
        user: state.originalSuperAdmin,
        isSwitchedUser: false,
        originalSuperAdmin: null
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;
