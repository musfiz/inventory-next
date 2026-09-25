'use client';

import useSWR from 'swr';
import productService from '@/services/productService';
import { unwrapListResponse } from '@/lib/api/response-helpers';
import type { Product } from '@/types/api.types';

/**
 * SWR key for the business-type (+ search, + optional category) scoped product
 * list. Including `categoryId` in the key means switching categories is treated
 * as a distinct cache entry — no cross-contamination between category views.
 */
export const productsQueryKey = (
  businessTypeId: string | number | null | undefined,
  search: string,
  categoryId?: string | null
) => ['products', businessTypeId ?? null, search, categoryId ?? null] as const;

async function fetchProducts(
  businessTypeId: string | number | null | undefined,
  search: string,
  categoryId?: string | null
): Promise<Product[]> {
  const params: {
    per_page: number;
    lite: number;
    search?: string;
    business_type_id?: string | number;
    category_id?: string;
  } = { per_page: 100, lite: 1 };
  if (search.trim()) params.search = search.trim();
  if (businessTypeId) params.business_type_id = businessTypeId;
  if (categoryId) params.category_id = categoryId;
  const res = await productService.getProducts(params);
  return unwrapListResponse<Product>(res, 'products');
}

/**
 * Business-type (+ search, + optional category) scoped product list for the
 * left tree. Pass `enabled: false` until auth hydrates to avoid the
 * pre-hydration double fetch. All consumers of the same key share one cached
 * request.
 *
 * `categoryId` is optional — the product-management tree calls this without
 * one to list every product under the business type.
 */
export function useProducts(
  businessTypeId: string | number | null | undefined,
  search: string,
  enabled: boolean,
  categoryId?: string | null
) {
  return useSWR(
    enabled ? productsQueryKey(businessTypeId, search, categoryId) : null,
    () => fetchProducts(businessTypeId, search, categoryId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );
}