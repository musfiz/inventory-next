'use client';

import useSWR from 'swr';
import productVariationService from '@/services/productVariationService';
import { unwrapListResponse } from '@/lib/api/response-helpers';
import type { ProductVariation } from '@/types/api.types';

export const variationsQueryKey = (productId: string) => ['variations', productId] as const;

async function fetchVariations(productId: string): Promise<ProductVariation[]> {
  const res = await productVariationService.getVariations({
    product_id: productId,
    per_page: 100,
  });
  return unwrapListResponse<ProductVariation>(res, 'variations');
}

/**
 * Variations for one product, shared between the tree (expanded rows) and the
 * detail panel via the same SWR key — expanding a node and then selecting the
 * product serves the second consumer from cache with zero extra requests.
 * After a save/delete, call the returned `mutate()` (or the global `mutate`
 * with the same key) once instead of refetching in two places.
 */
export function useProductVariations(productId: string | null | undefined) {
  return useSWR(productId ? variationsQueryKey(productId) : null, () => fetchVariations(productId as string), {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });
}
