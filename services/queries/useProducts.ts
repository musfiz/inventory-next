'use client';

import useSWR from 'swr';
import productService from '@/services/productService';
import { unwrapListResponse } from '@/lib/api/response-helpers';
import type { Product } from '@/types/api.types';

export const productsQueryKey = (
  businessTypeId: number | null | undefined,
  search: string
) => ['products', businessTypeId ?? null, search] as const;

async function fetchProducts(
  businessTypeId: number | null | undefined,
  search: string
): Promise<Product[]> {
  const params: {
    per_page: number;
    lite: number;
    search?: string;
    business_type_id?: number;
  } = { per_page: 100, lite: 1 };
  if (search.trim()) params.search = search.trim();
  if (businessTypeId) params.business_type_id = businessTypeId;
  const res = await productService.getProducts(params);
  return unwrapListResponse<Product>(res, 'products');
}

/**
 * Business-type (+ search) scoped product list for the left tree.
 * Pass `enabled: false` until auth hydrates to avoid the pre-hydration
 * double fetch. All consumers of the same key share one cached request.
 */
export function useProducts(
  businessTypeId: number | null | undefined,
  search: string,
  enabled: boolean
) {
  return useSWR(
    enabled ? productsQueryKey(businessTypeId, search) : null,
    () => fetchProducts(businessTypeId, search),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );
}
