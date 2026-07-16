'use client';

import { useEffect } from 'react';
import { useStorefrontStatusStore } from '@/stores/storefront-status-store';

export function useStorefrontStatus() {
  const active = useStorefrontStatusStore((s) => s.active);
  const loading = useStorefrontStatusStore((s) => s.loading);
  const fetch = useStorefrontStatusStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { active, loading };
}
