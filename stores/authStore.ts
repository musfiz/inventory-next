import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/services/authService';

/**
 * Auth Store - Persisted State Management
 * 
 * For cookie-based auth, we persist user data (not tokens) in localStorage
 * for better UX. This allows immediate display of user info on page load
 * while the session cookie is verified in the background.
 * 
 * The actual authentication is handled by HTTP-only cookies.
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isSwitchedUser: boolean;
  originalSuperAdmin: User | null;
  isHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSwitchedUser: (isSwitched: boolean, originalAdmin?: User | null) => void;
  setHydrated: (hydrated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isSwitchedUser: false,
      originalSuperAdmin: null,
      isHydrated: false,

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),

      setSwitchedUser: (isSwitched, originalAdmin = null) => set({
        isSwitchedUser: isSwitched,
        originalSuperAdmin: originalAdmin,
      }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      clearAuth: () => set({
        user: null,
        isLoading: false,
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
