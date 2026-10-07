'use client';

import { CloudOff, RefreshCw, ServerCrash, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOffline } from '@/hooks/use-offline';
import type { NetworkReason } from '@/lib/api/network-error';

/**
 * Copy per failure mode.
 *
 * Three variants, because "you have no network" and "the service is down for
 * maintenance" call for different user behaviour: the first is worth retrying
 * somewhere else, the second is worth waiting out.
 *
 * Maintenance gets its own line because Laravel's maintenance mode is served
 * before the HTTP kernel runs, so it can never carry the origin marker. An
 * unmarked 503 is therefore positively identified as maintenance rather than
 * guessed at.
 */
const COPY = {
  no_link: {
    title: "You're offline",
    body: 'Check your connection. Requests will resume once you reconnect.',
    Icon: WifiOff,
  },
  maintenance: {
    title: 'Temporarily unavailable',
    body: 'The service is down for maintenance. Please try again shortly.',
    Icon: ServerCrash,
  },
  unreachable: {
    title: "Can't reach the server",
    body: 'Your connection is up, but the server is not responding.',
    Icon: CloudOff,
  },
} as const;

function resolveCopy(
  status: 'online' | 'offline' | 'unreachable',
  reason: NetworkReason | null
) {
  if (status === 'unreachable') {
    return reason === 'maintenance' ? COPY.maintenance : COPY.unreachable;
  }
  return COPY.no_link;
}

/**
 * Non-blocking connectivity notice, mounted once in the root layout.
 *
 * Positioned bottom-centre rather than as an in-flow banner on purpose: the app
 * shell is a fixed sidebar/header layout, so a top banner would either overlap
 * the header or push every page's layout down when it appears. A floating pill
 * avoids refreflow entirely, and dismissal keeps it from covering content the
 * user is actively working in.
 *
 * Dismissal is scoped to the *current* outage: it stores the `changedAt` stamp
 * of the failure it dismissed, so the next distinct outage re-announces itself
 * instead of staying silently hidden. `changedAt` only moves on a real status
 * change, so repeated failures during one outage cannot reset a dismissal the
 * user already made.
 *
 * This is informational. It never blocks a write — see `canBlockWrites` in
 * `hooks/use-offline.ts` for the one case where that is justified.
 */
export default function OfflineBanner() {
  const { isOffline, status, reason, changedAt, hydrated, refresh } = useOffline();
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  // Gate on `hydrated`: during SSR and the first client render the store holds
  // optimistic defaults, so rendering here would mismatch the server output.
  if (!hydrated || !isOffline) return null;

  // Already dismissed for this specific outage.
  if (changedAt !== null && dismissedAt === changedAt) return null;

  const { title, body, Icon } = resolveCopy(status, reason);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      // `polite` rather than `assertive`: losing connectivity is important but
      // not urgent enough to interrupt whatever the user is doing.
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-90 flex justify-center px-4 sm:bottom-6"
    >
      <div className="flex w-full max-w-md items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-700/60 dark:bg-amber-950/90 sm:items-center">
        <Icon
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 sm:mt-0"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {title}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200/90">{body}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleRetry}
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 focus-visible:ring-offset-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-100 dark:hover:bg-amber-900/60 dark:focus-visible:ring-offset-amber-950"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
            />
            {checking ? 'Checking' : 'Retry'}
          </button>

          <button
            type="button"
            onClick={() => setDismissedAt(changedAt)}
            aria-label="Dismiss connection warning"
            className="rounded-md p-1.5 text-amber-700 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/60"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}