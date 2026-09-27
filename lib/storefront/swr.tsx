'use client';

import { SWRConfig } from 'swr';

/**
 * Global SWR setup for client-side storefront/admin data fetching.
 *
 * Design notes:
 * - `revalidateOnFocus: false` — a shopper tabbing back to the store must not
 *   trigger a herd of refetches; freshness comes from mount + dedupe instead.
 * - `keepPreviousData: true` — filter/page switches render the previous result
 *   while the next one loads (no flash-to-skeleton on pagination/filters).
 * - `dedupingInterval: 15_000` — concurrent mounts of the same key (header +
 *   footer + page all reading branding/status) collapse into ONE request; a
 *   remount within 15s reuses the settled result without refetching.
 * - `errorRetryCount: 1` — storefront 404s are terminal (pages render notFound
 *   from them); default exponential backoff would hammer the API during
 *   backend downtime.
 *
 * The fetcher returns the raw axios response so hooks can read `res.data`
 * (the `{ success, message, data }` envelope) and `res.status` (404 checks).
 */
export const SWR_PROVIDER_VALUE = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  dedupingInterval: 15_000,
  errorRetryCount: 1,
};

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={SWR_PROVIDER_VALUE}>{children}</SWRConfig>;
}
