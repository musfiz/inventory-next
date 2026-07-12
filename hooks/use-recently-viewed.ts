'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types/storefront';
import { PRODUCTS } from '@/lib/storefront/mock-data';

const STORAGE_KEY = 'uims-recently-viewed';
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const trackView = useCallback((productId: string) => {
    setIds(prev => {
      const next = [productId, ...prev.filter(id => id !== productId)].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const products: Product[] = ids
    .map(id => PRODUCTS.find(p => p.id === id))
    .filter(Boolean) as Product[];

  return { products, trackView };
}
