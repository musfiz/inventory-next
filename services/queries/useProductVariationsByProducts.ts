'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import productVariationService from '@/services/productVariationService';
import { unwrapListResponse } from '@/lib/api/response-helpers';
import { useProducts } from './useProducts';
import type { Product, ProductVariation } from '@/types/api.types';

/**
 * Fetch every variation for a set of product ids in one SWR call. The key is
 * the sorted id list, so switching categories (which changes the product set)
 * is a distinct cache entry — no cross-contamination between category views.
 *
 * Returns a map of productId -> ProductVariation[]. Products with no
 * variations are simply absent from the map.
 */
const variationsForProductsKey = (productIds: string[]) =>
  ['variations-for', ...[...productIds].sort()] as const;

async function fetchVariationsFor(productIds: string[]): Promise<Map<string, ProductVariation[]>> {
  const map = new Map<string, ProductVariation[]>();
  // One request per product (each is cached by useProductVariations too, so
  // the tree/detail panel and this page share the same responses).
  await Promise.all(
    productIds.map(async id => {
      try {
        const res = await productVariationService.getVariations({
          product_id: id,
          per_page: 100,
        });
        const list = unwrapListResponse<ProductVariation>(res, 'variations');
        if (list.length > 0) map.set(id, list);
      } catch {
        // A single product's variation fetch failing is non-fatal — that
        // product simply renders without its variation children.
      }
    })
  );
  return map;
}

/**
 * All products under a (business type + optional category) scope, plus a map
 * of productId -> variations for every one of them. Driven by SWR so it shares
 * cache entries with the product-management tree and detail panel.
 */
export function useProductVariationsByProducts(
  businessTypeId: number | null | undefined,
  search: string,
  enabled: boolean,
  categoryId?: string | null
) {
  const productsQuery = useProducts(businessTypeId, search, enabled, categoryId);

  const productIds = useMemo(
    () => (productsQuery.data ?? []).map(p => String(p.id)),
    [productsQuery.data]
  );

  const variationsQuery = useSWR(
    enabled && productIds.length ? variationsForProductsKey(productIds) : null,
    () => fetchVariationsFor(productIds),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const loading =
    productsQuery.isLoading ||
    (variationsQuery.isValidating && !variationsQuery.data);

  return {
    products: productsQuery.data ?? [],
    variationsByProduct: variationsQuery.data ?? new Map(),
    loading,
    error: productsQuery.error,
    mutate: productsQuery.mutate,
  };
}