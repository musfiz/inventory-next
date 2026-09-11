'use client';

import useSWR from 'swr';
import binService from '@/services/binService';

/**
 * Bin dropdown preload, scoped to a warehouse (+ tenant). Cached under
 * ['binsDropdown', warehouse, tenant] so form open/close cycles and
 * variation-to-variation switches with the same (sticky) warehouse hit the
 * cache instead of refetching (same Issue 5 rationale as warehouses).
 * Search-as-you-type stays live in the component's `loadOptions` and is
 * intentionally NOT cached here.
 */
export function useBinsDropdown(
  warehouseId: string | null | undefined,
  tenantId: string | null | undefined,
  enabled: boolean
) {
  return useSWR(
    enabled && warehouseId && tenantId ? (['binsDropdown', warehouseId, tenantId] as const) : null,
    () =>
      binService.getBinsForDropdown({
        warehouse_id: warehouseId as string,
        tenant_id: tenantId as string,
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes — bins change more often than brands/units
    }
  );
}
