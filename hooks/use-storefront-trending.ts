'use client';

import { useEffect } from 'react';
import { useStorefrontTrendingStore } from '@/stores/storefront-trending-store';

export function useStorefrontTrending() {
  const terms = useStorefrontTrendingStore((s) => s.terms);
  const loading = useStorefrontTrendingStore((s) => s.loading);
  const ready = useStorefrontTrendingStore((s) => s.ready);
  const fetch = useStorefrontTrendingStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { terms, loading, ready };
}
