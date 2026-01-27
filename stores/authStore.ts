import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  isSwitchedUser: boolean;
  originalSuperAdmin: User | null;

  // State Actions (no API calls)
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  setSwitchedUser: (isSwitched: boolean, originalAdmin?: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isHydrated: false,
      isSwitchedUser: false,
      originalSuperAdmin: null,

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      setSwitchedUser: (isSwitched, originalAdmin = null) => set({
        isSwitchedUser: isSwitched,
        originalSuperAdmin: originalAdmin,
      }),

      clearAuth: () => set({
        user: null,
        isSwitchedUser: false,
        originalSuperAdmin: null,
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isSwitchedUser: state.isSwitchedUser,
        originalSuperAdmin: state.originalSuperAdmin,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
