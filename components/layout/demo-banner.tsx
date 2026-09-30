'use client';

import { useAuthStore } from '@/stores/auth-store';

export default function DemoBanner() {
  const isDemo = useAuthStore(state => state.isDemo);

  if (!isDemo) return null;

  return (
    <div
      role="status"
      className="w-full bg-indigo-600 text-white text-center text-xs sm:text-sm font-medium px-4 py-1.5"
    >
      Demo mode — changes are disabled
    </div>
  );
}
