'use client';

import { useEffect } from 'react';
import { useStorefrontStatusStore } from '@/stores/storefront-status-store';
import { useStorefrontSettingsStore } from '@/stores/storefront-settings-store';

export function useStorefrontStatus() {
  const active = useStorefrontStatusStore((s) => s.active);
  const activeTenantId = useStorefrontStatusStore((s) => s.activeTenantId);
  const loading = useStorefrontStatusStore((s) => s.loading);
  const fetch = useStorefrontStatusStore((s) => s.fetch);

  const expressCheckoutEnabled = useStorefrontSettingsStore((s) => s.expressCheckoutEnabled);
  const fetchSettings = useStorefrontSettingsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
    fetchSettings();
  }, [fetch, fetchSettings]);

  return { active, activeTenantId, loading, expressCheckoutEnabled, fetch };
}
