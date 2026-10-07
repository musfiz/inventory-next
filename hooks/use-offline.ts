'use client';

import { useCallback } from 'react';
import type { NetworkReason } from '@/lib/api/network-error';
import { refreshNetworkStatus } from '@/lib/api/network-monitor';
import { useNetworkStore } from '@/stores/network-store';
import type { NetworkStatus, ServerReachability } from '@/stores/network-store';

export interface UseOfflineResult {
  /**
   * The headline flag: the network is unusable. True both when there is no
   * connection at all (`status: 'offline'`) and when the connection exists but
   * Laravel is unreachable (`status: 'unreachable'`).
   *
   * Suitable for *informational* UI. Do **not** use it to disable a submit
   * button — see `canBlockWrites` below.
   */
  isOffline: boolean;
  /** The browser reports a usable network interface. */
  isOnline: boolean;
  /**
   * Laravel answered the most recent request that carried its origin marker.
   *
   * False while the link is down: the browser knows the link is gone, which
   * tells us nothing about the server either way.
   */
  isReachable: boolean;
  /** Full tri-state, for copy that distinguishes "no network" from "server down". */
  status: NetworkStatus;
  /**
   * What is actually known about Laravel, which is not the same as what is
   * known about the link. `unknown` means no observation either way.
   */
  reachability: ServerReachability;
  /** Why the app believes it is degraded. `null` while healthy. */
  reason: NetworkReason | null;
  /** Epoch ms of the last status change; null before the first change. */
  changedAt: number | null;
  /**
   * False during SSR and the first client render, true once `navigator.onLine`
   * has been read. Gate UI on this before showing an offline state, otherwise a
   * server render will disagree with the client and trip a hydration mismatch.
   */
  hydrated: boolean;
  /**
   * Whether it is safe to block a write outright.
   *
   * True only on `offline` with `reason: 'no_link'` — the browser itself saying
   * nothing can be sent. Deliberately false on `unreachable`: that state is
   * reached only after a confirmation probe also failed, but it is still a
   * conclusion about a server rather than the local link, and blocking on it
   * would lock a user out over a false alarm. A blocked write fails fast anyway.
   */
  canBlockWrites: boolean;
  /**
   * Force an immediate connectivity check: re-reads the browser state and
   * probes Laravel. Returns once the probe settles.
   */
  refresh: () => Promise<void>;
}

/**
 * Read connectivity state.
 *
 * Backed by `stores/network-store.ts`, which is fed from three places: the
 * browser's `online`/`offline` events, `lib/api/axios.ts`, which reports
 * suspect evidence from real requests, and the confirmation probe that decides
 * whether an outage is real. `navigator.onLine` cannot detect a down backend;
 * a marked response can.
 *
 * Because the state lives in a store rather than in component state, every
 * caller shares one source of truth and one set of listeners, no matter how
 * many components call this hook.
 *
 * @example
 * // Informational: say what is wrong without guessing.
 * const { status, reason } = useOffline();
 * <p>{reason === 'maintenance' ? 'Down for maintenance' : status}</p>
 *
 * @example
 * // Gating a write is only justified when the browser says there is no link.
 * const { canBlockWrites } = useOffline();
 * <button disabled={canBlockWrites || isSaving}>Save</button>
 *
 * @example
 * // On a failed mutation, show the real failure — not a generic offline notice.
 * const { refresh } = useOffline();
 * try {
 *   await save();
 * } catch (error) {
 *   notify.error(describeNetworkError(error));
 * }
 */
export function useOffline(): UseOfflineResult {
  const isOnline = useNetworkStore(state => state.isOnline);
  const isReachable = useNetworkStore(state => state.isReachable);
  const isOffline = useNetworkStore(state => state.isOffline);
  const status = useNetworkStore(state => state.status);
  const reachability = useNetworkStore(state => state.reachability);
  const reason = useNetworkStore(state => state.reason);
  const changedAt = useNetworkStore(state => state.changedAt);
  const hydrated = useNetworkStore(state => state.hydrated);

  const refresh = useCallback(async () => {
    await refreshNetworkStatus();
  }, []);

  return {
    isOffline,
    isOnline,
    isReachable,
    status,
    reachability,
    reason,
    changedAt,
    hydrated,
    canBlockWrites: status === 'offline' && reason === 'no_link',
    refresh,
  };
}

export default useOffline;