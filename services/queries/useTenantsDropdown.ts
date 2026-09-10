'use client';

import useSWR from 'swr';
import { commonService } from '@/services';
import type { Tenant } from '@/types/api.types';

/**
 * Tenant dropdown preload, cached under a single global key.
 * SWR's cache survives React 18 StrictMode's mount → unmount → remount cycle,
 * so the second mount hits the cache instead of firing a duplicate
 * GET /api/v1/dropdown/tenant (Issue 5). Search-as-you-type stays live via
 * TenantSelect's `loadOptions` and is intentionally NOT cached here.
 */
export function useTenantsDropdown() {
  return useSWR('tenantsDropdown', () => commonService.getTenantsForDropdown({ search: '' }), {
    revalidateOnFocus: false,
    dedupingInterval: 10 * 60 * 1000, // 10 minutes — tenants change infrequently
  });
}

export type { Tenant };
