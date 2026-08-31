'use client';

import { useStorefrontStatus } from './use-storefront-status';

/** Active tenant's storefront display name, with a neutral fallback while loading. */
export function useStoreName(fallback = 'Store') {
  const { storeName } = useStorefrontStatus();
  return storeName || fallback;
}
