'use client';

import { useEffect } from 'react';
import { useStorefrontCategoriesStore } from '@/stores/storefront-categories-store';

export function useStorefrontCategories() {
  const categories = useStorefrontCategoriesStore((s) => s.categories);
  const loading = useStorefrontCategoriesStore((s) => s.loading);
  const ready = useStorefrontCategoriesStore((s) => s.ready);
  const fetch = useStorefrontCategoriesStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { categories, loading, ready };
}
