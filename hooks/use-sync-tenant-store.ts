import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import tenantService from '@/services/tenantService';

/**
 * Auto-syncs the tenant store for regular tenant users.
 *
 * - Super-admin: store is populated manually via the profile settings page.
 * - Tenant admin / tenant user: on mount (or whenever the logged-in user
 *   changes) this hook fetches the user's own tenant + its settings and
 *   writes them into the store, keeping print components in sync without
 *   any extra API calls later.
 *
 * The fetch is skipped when:
 *   • the user is a super-admin (they manage their own selection),
 *   • the store already holds the correct tenant (no re-fetch needed),
 *   • the user has no tenant_id.
 */
export function useSyncTenantStore() {
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const { selectedTenant, setSelectedTenant, setTenantSettings } = useTenantStore();

  // Track the last tenant_id we synced so we don't fire twice on re-renders.
  const syncedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user) return;

    // Super-admin manages their own tenant selection via the profile page.
    if (user.user_type === 'super_admin') return;

    const tenantId = user.tenant_id ? String(user.tenant_id) : null;
    if (!tenantId) return;

    // Already synced for this tenant — nothing to do.
    if (syncedForRef.current === tenantId && selectedTenant?.id === tenantId) return;

    syncedForRef.current = tenantId;

    tenantService.getTenantSettings(tenantId)
      .then(settings => {
        // Build a minimal Tenant object from the user's embedded tenant or just the id.
        const tenant = user.tenant ?? { id: tenantId, business_name: '' };
        setSelectedTenant(tenant as any);
        setTenantSettings(settings);
      })
      .catch(() => {
        // Non-critical — print components will fall back to an API call.
      });
  }, [hydrated, user?.id, user?.tenant_id]);
}
