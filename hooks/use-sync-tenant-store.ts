import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import tenantService from '@/services/tenantService';

/**
 * Auto-syncs the tenant store on every protected page mount.
 *
 * - Tenant admin / tenant user: fetches the user's own tenant + its
 *   settings automatically on mount (or login change).
 * - Super-admin: fetches settings for their currently selected tenant
 *   (set via the profile settings page) so that settings are always
 *   available even after a hard reload.
 *
 * The fetch is skipped when:
 *   • the store already has settings for the same tenant,
 *   • the user has no tenant_id (tenant users) or no selectedTenant
 *     (super-admins).
 */
export function useSyncTenantStore() {
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const { selectedTenant, tenantSettings, setSelectedTenant, setTenantSettings } = useTenantStore();

  const syncedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user) return;

    let tenantId: string | null = null;

    if (user.user_type === 'super_admin') {
      tenantId = selectedTenant?.id ? String(selectedTenant.id) : null;
    } else {
      tenantId = user.tenant_id ? String(user.tenant_id) : null;
    }

    if (!tenantId) return;

    if (syncedForRef.current === tenantId && tenantSettings) return;

    syncedForRef.current = tenantId;

    tenantService.getTenantSettings(tenantId)
      .then(settings => {
        if (user.user_type !== 'super_admin') {
          const tenant = user.tenant ?? { id: tenantId, business_name: '' };
          setSelectedTenant(tenant as any);
        }
        setTenantSettings(settings);
      })
      .catch(() => {});
  }, [hydrated, user?.id, user?.tenant_id, selectedTenant?.id]);
}
