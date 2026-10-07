'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import {
  startNetworkMonitoring,
  stopNetworkMonitoring,
  subscribeNetworkRecovery,
} from '@/lib/api/network-monitor';

/**
 * Mounts the connectivity engine once, for the whole app.
 *
 * Rendered in the root layout and rendered nothing — its only job is lifetime
 * management. Doing this in a component (rather than on module import) keeps
 * listener setup inside React's lifecycle, which makes it safe under StrictMode
 * double-invocation and in tests where modules are imported without a DOM.
 *
 * It also bridges recovery into SWR. SWR revalidates on the browser's `online`
 * event on its own, but that misses the case this system exists for: the
 * browser never went offline, the *server* did, and then came back. Subscribing
 * to recovery covers both, so cached data is refetched the moment the API is
 * reachable again instead of showing stale rows until the next interaction.
 */
export default function NetworkMonitor() {
  const { cache, mutate } = useSWRConfig();

  useEffect(() => {
    startNetworkMonitoring();

    /**
     * Revalidate every mounted SWR key — the same thing SWR itself does on
     * reconnect. A keyless `mutate()` is not valid in SWR 2, so the cache is
     * enumerated instead.
     *
     * Guarded to fire only on a real offline → online transition, so mounting
     * this component never triggers a request burst.
     */
    const unsubscribe = subscribeNetworkRecovery(() => {
      for (const key of cache.keys()) {
        void mutate(key);
      }
    });

    return () => {
      unsubscribe();
      stopNetworkMonitoring();
    };
  }, [cache, mutate]);

  return null;
}