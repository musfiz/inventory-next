import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant, TenantSettings } from '@/types/api.types';

interface TenantState {
  /** The tenant selected by the super-admin as their "default" context. */
  selectedTenant: Tenant | null;
  /** The 14 key-value settings fetched from /api/v1/tenants/{id}/settings. */
  tenantSettings: TenantSettings | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  setTenantSettings: (settings: TenantSettings | null) => void;
  clearTenantData: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    set => ({
      selectedTenant: null,
      tenantSettings: null,
      setSelectedTenant: tenant => set({ selectedTenant: tenant }),
      setTenantSettings: settings => set({ tenantSettings: settings }),
      clearTenantData: () => set({ selectedTenant: null, tenantSettings: null }),
    }),
    {
      name: 'tenant-storage',
    }
  )
);

export default useTenantStore;
