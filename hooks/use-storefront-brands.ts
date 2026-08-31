'use client';

import { useEffect } from 'react';
import { useStorefrontBrandsStore } from '@/stores/storefront-brands-store';

export function useStorefrontBrands() {
  const brands = useStorefrontBrandsStore((s) => s.brands);
  const loading = useStorefrontBrandsStore((s) => s.loading);
  const ready = useStorefrontBrandsStore((s) => s.ready);
  const fetch = useStorefrontBrandsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { brands, loading, ready };
}
