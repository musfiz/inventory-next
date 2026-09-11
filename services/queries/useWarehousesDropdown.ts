'use client';

import useSWR from 'swr';
import commonService from '@/services/commonService';

/**
 * Warehouse dropdown preload, scoped to a tenant (same scope as the
 * variation stock form). Cached under ['warehousesDropdown', tenant] so
 * StrictMode remounts and form open/close cycles hit the cache instead of
 * firing a duplicate GET /api/v1/tenant/{id}/warehouse (same Issue 5
 * rationale as brands/units). Search-as-you-type stays live in the
 * component's `loadOptions` and is intentionally NOT cached here.
 */
export function useWarehousesDropdown(tenantId: string | null | undefined, enabled: boolean) {
  return useSWR(
    enabled && tenantId ? (['warehousesDropdown', tenantId] as const) : null,
    () => commonService.getWarehousesByTenant({ tenant_id: tenantId as string }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes — warehouses change more often than brands/units
    }
  );
}
