'use client';

import { create } from 'zustand';

interface LoadingStore {
  /** Number of in-flight tracked requests. */
  activeRequests: number;
  /** True while at least one request is active. */
  isLoading: boolean;
  /** Increment the in-flight request counter. */
  start: () => void;
  /** Decrement the in-flight request counter (clamped at zero). */
  stop: () => void;
  /** Reset the counter to zero (tests / fatal recovery). */
  reset: () => void;
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  activeRequests: 0,
  isLoading: false,
  start: () => {
    const activeRequests = get().activeRequests + 1;
    set({ activeRequests, isLoading: true });
  },
  stop: () => {
    const activeRequests = Math.max(0, get().activeRequests - 1);
    set({ activeRequests, isLoading: activeRequests > 0 });
  },
  reset: () => set({ activeRequests: 0, isLoading: false }),
}));
