'use client';

import useSWR from 'swr';
import commonService from '@/services/commonService';

/**
 * Unit dropdown preload (global, not business-type scoped). Cached under a
 * single key so StrictMode remounts and form open/close cycles hit the cache
 * instead of firing a duplicate GET /api/v1/dropdown/unit.
 * Search-as-you-type stays live via the component's `loadOptions`.
 */
export function useUnitsDropdown(enabled: boolean) {
  return useSWR(
    enabled ? (['unitsDropdown'] as const) : null,
    () => commonService.getUnitsForDropdown({ search: '' }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes — units change infrequently
    }
  );
}
