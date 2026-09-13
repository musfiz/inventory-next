'use client';

import useSWR from 'swr';
import commonService from '@/services/commonService';

/**
 * Fetch brands filtered by business type for the product tree view.
 * Only loads when business type is selected (enabled flag).
 * Cached under ['brandsByBt', bt] for 10 minutes.
 */
export function useBrandsByBusinessType(
  businessTypeId: number | null | undefined,
  enabled: boolean
) {
  return useSWR(
    enabled ? (['brandsByBt', businessTypeId ?? null] as const) : null,
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
