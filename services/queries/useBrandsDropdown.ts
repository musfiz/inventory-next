'use client';

import useSWR from 'swr';
import commonService from '@/services/commonService';

/**
 * Brand dropdown preload, scoped to a business type (same scope as the
 * product form). Cached under ['brandsDropdown', bt] so StrictMode remounts
 * and form open/close cycles hit the cache instead of firing a duplicate
 * GET /api/v1/dropdown/brand (same Issue 5 rationale as tenant/business-type).
 * Search-as-you-type stays live in the component's `loadOptions` (if any)
 * and is intentionally NOT cached here.
 */
export function useBrandsDropdown(
  businessTypeId: string | number | null | undefined,
  enabled: boolean
) {
  return useSWR(
    enabled ? (['brandsDropdown', businessTypeId ?? null] as const) : null,
    () =>
      commonService.getBrandsForDropdown(
        businessTypeId ? { business_type_id: businessTypeId } : {}
      ),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes — brands change infrequently
    }
  );
}
