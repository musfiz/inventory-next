'use client';

import useSWR from 'swr';
import productService from '@/services/productService';

export const productQueryKey = (productId: string) => ['product', productId] as const;

/**
 * Single product for the detail panel. A `null` id disables the query, and
 * SWR handles stale-response ordering internally (no manual `mounted` guard
 * needed on rapid selection changes).
 */
export function useProduct(productId: string | null | undefined) {
  return useSWR(productId ? productQueryKey(productId) : null, () => productService.getProduct(productId as string), {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });
}
