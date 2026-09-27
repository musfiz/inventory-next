'use client';

import useSWR from 'swr';
import apiClient from '@/lib/api/axios';
import { SK } from '@/lib/storefront/keys';
import storefrontSettingsService from '@/services/storefrontSettingsService';

export interface StorefrontSettings {
  expressCheckoutEnabled: boolean;
  storeName: string | null;
  storefrontTheme: 'default' | 'grocery';
}

export function useStorefrontSettings() {
  const { data, isLoading, mutate } = useSWR<StorefrontSettings>(
    SK.settings,
    async () => {
      const res = await storefrontSettingsService.get();
      return {
        expressCheckoutEnabled: res.express_checkout_enabled ?? false,
        storeName: res.store_name ?? null,
        storefrontTheme: (res.storefront_theme as 'default' | 'grocery') ?? 'default',
      };
    },
    { shouldRetryOnError: false },
  );
  return {
    settings: data ?? null,
    storeName: data?.storeName ?? null,
    expressCheckoutEnabled: data?.expressCheckoutEnabled ?? false,
    storefrontTheme: data?.storefrontTheme ?? 'default',
    loading: isLoading,
    fetch: () => mutate(),
  };
}

export function useStorefrontStatus() {
  const { data, error, isLoading, mutate } = useSWR<{
    active: boolean;
    activeTenantId: string | null;
  }>(
    SK.status,
    async () => {
      const res = await apiClient.get('/api/v1/storefront/status');
      return {
        active: res.data?.data?.storefront_active ?? false,
        activeTenantId: res.data?.data?.active_tenant_id ?? null,
      };
    },
    { shouldRetryOnError: false },
  );
  const settings = useStorefrontSettings();

  return {
    // null = unknown yet (layout renders loader); error → inactive.
    active: data?.active ?? (error ? false : null),
    activeTenantId: data?.activeTenantId ?? null,
    loading: isLoading,
    expressCheckoutEnabled: settings.expressCheckoutEnabled,
    storeName: settings.storeName,
    storefrontTheme: settings.storefrontTheme,
    /** Force a fresh status read (e.g. after tenant switch in admin). */
    fetch: () => mutate(),
    fetchSettings: settings.fetch,
  };
}
