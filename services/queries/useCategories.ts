'use client';

import useSWR from 'swr';
import apiClient from '@/lib/api/axios';
import { unwrapListResponse } from '@/lib/api/response-helpers';
import type { Category } from '@/types/api.types';

export const categoriesQueryKey = (businessTypeId: number | null | undefined) =>
  ['categories', businessTypeId ?? null] as const;

async function fetchCategories(businessTypeId: number | null | undefined): Promise<Category[]> {
  const params: Record<string, unknown> = { per_page: 100 };
  if (businessTypeId) params.business_type_id = businessTypeId;
  const res = await apiClient.get('/api/v1/categories', { params });
  const raw = unwrapListResponse<Record<string, unknown>>(res.data);
  return raw.map(
    r =>
      ({
        id: String(r.id),
        name: r.name,
        description: r.description,
        parent_id: r.parent_id ? String(r.parent_id) : undefined,
        is_active: !!r.is_active,
        storefront_active: !!(r as { storefront_active?: unknown }).storefront_active,
        business_types: r.business_types,
        business_type: r.business_type,
        parent: r.parent,
      }) as Category
  );
}

/**
 * Categories for the product form dropdown, scoped to a business type.
 * Pass `enabled: false` (e.g. until auth hydrates) to skip the fetch entirely —
 * this eliminates the pre-hydration request with a wrong/null business type.
 */
export function useCategories(businessTypeId: number | null | undefined, enabled: boolean) {
  return useSWR(enabled ? categoriesQueryKey(businessTypeId) : null, () => fetchCategories(businessTypeId), {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
}
