'use client';

import useSWR from 'swr';
import { businessTypeService } from '@/services/businessTypeService';

/**
 * Business-type dropdown preload, cached under a single global key.
 * Same StrictMode dedup rationale as useTenantsDropdown (Issue 5):
 * the remount hits the cache instead of firing a duplicate
 * GET /api/v1/business-types/dropdown. Live search stays in
 * BusinessTypeSelect's `loadOptions`.
 */
export function useBusinessTypesDropdown() {
  return useSWR(
    'businessTypesDropdown',
    () => businessTypeService.getForDropdown({ search: '' }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes — business types change infrequently
    }
  );
}
