import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { userService } from '@/services/userService';

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  isSwitchedUser: boolean;
  originalSuperAdmin: { id: string; name: string; email: string } | null;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  clearAuth: () => void;
  switchUser: (userId: string) => Promise<boolean>;
  switchBack: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,
      isSwitchedUser: false,
      originalSuperAdmin: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null, isSwitchedUser: false, originalSuperAdmin: null }),
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setHydrated: (hydrated) => set({ hydrated }),
      clearAuth: () => set({ user: null, isSwitchedUser: false, originalSuperAdmin: null }),
      switchUser: async (userId: string) => {
        try {
          const response = await userService.switchUser(userId);
          set({
            user: response.user,
            isSwitchedUser: true,
            originalSuperAdmin: response.switched_from
          });
          return true;
        } catch (error) {
          console.error('Failed to switch user:', error);
          return false;
        }
      },
      switchBack: async () => {
        try {
          const response = await userService.switchBack();
          set({
            user: response.user,
            isSwitchedUser: false,
            originalSuperAdmin: null
          });
          return true;
        } catch (error) {
          console.error('Failed to switch back:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export default useAuthStore;
