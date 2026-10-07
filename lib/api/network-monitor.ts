'use client';

import Axios from 'axios';
import { classifyNetworkError, classifyResponse, reasonFromEvidence } from '@/lib/api/network-error';
import { useNetworkStore } from '@/stores/network-store';
import type { NetworkEvent } from '@/stores/network-store';

/**
 * Connectivity engine: browser events, confirmation, and recovery.
 *
 * Three inputs feed one store, and this module is the only place they are
 * wired together:
 *
 * 1. **Browser events** (`online` / `offline`) — cheap and immediate, but
 *    link-level only. They fire on a Wi-Fi toggle, never on a dead backend.
 * 2. **Suspect evidence from real requests**, via the axios interceptor.
 * 3. **A health probe** — the only request that can honestly answer "did
 *    Laravel answer?", because it requires a 200 carrying the origin marker.
 *
 * ## Verify, then announce
 *
 * One failed request is a suspicion, not an outage: it could be a slow report,
 * a flaky response, a captive portal. So suspect evidence does not move the
 * status. It arms a confirmation probe, and only a probe that *also* fails
 * promotes the app to `unreachable`. This is the single most important
 * difference from V1, which announced on the first failure.
 *
 * ## Not a heartbeat
 *
 * While healthy this issues zero background requests. An outage is already
 * visible in the response path; probing a healthy API on a timer would double
 * backend load to learn something already known. The probe exists to notice
 * *recovery* while nobody is clicking anything, and to adjudicate a single
 * *failure*.
 *
 * Kept as a plain module rather than a component so non-React callers (the
 * axios interceptor) can share it without importing React.
 */

/**
 * Backoff between probes while not online, in milliseconds.
 *
 * Escalating rather than fixed-rate keeps a long outage cheap, while the first
 * few attempts stay fast enough that a brief blip resolves before the user
 * notices. The final entry repeats indefinitely.
 */
const RECOVERY_PROBE_BACKOFF_MS = [1_000, 5_000, 15_000, 30_000, 60_000] as const;

/**
 * Endpoint used only for reachability probing.
 *
 * Points at Laravel's unauthenticated health route rather than any business
 * endpoint. Two reasons: a business endpoint would either need credentials (so
 * every probe is a logged 401) or touch the database (so it can fail for
 * reasons unrelated to the backend being up). It must sit under `/api/` so
 * next.config.mjs proxies it to Laravel like every other call.
 *
 * Static `process.env.NEXT_PUBLIC_*` access is required here: Next.js inlines
 * those values at build time by literal match, so a computed `process.env[key]`
 * lookup would silently yield `undefined` in the browser bundle.
 */
const PROBE_URL = process.env.NEXT_PUBLIC_NETWORK_PROBE_URL || '/api/v1/health';
const PROBE_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_NETWORK_PROBE_TIMEOUT_MS) || 5_000;
const PROBE_ENABLED = process.env.NEXT_PUBLIC_NETWORK_RECOVERY_PROBE !== 'false';

/** Called when connectivity returns after having been lost. */
export type NetworkRecoveryListener = () => void;

const recoveryListeners = new Set<NetworkRecoveryListener>();

/** Register a callback fired once per offline → online recovery. */
export function subscribeNetworkRecovery(listener: NetworkRecoveryListener): () => void {
  recoveryListeners.add(listener);
  return () => {
    recoveryListeners.delete(listener);
  };
}

function notifyRecovery(): void {
  recoveryListeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      // A misbehaving subscriber (e.g. a revalidate that throws) must not stop
      // the others from running.
      console.error('[network] recovery listener failed:', error);
    }
  });
}

let started = false;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let probeInFlight: Promise<void> | null = null;
let probeFailures = 0;
let visibilityHandler: (() => void) | null = null;
let browserEventHandler: (() => void) | null = null;
let unsubscribeStore: (() => void) | null = null;

function clearProbeTimer(): void {
  if (probeTimer) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
}

function dispatch(event: NetworkEvent): void {
  useNetworkStore.getState().dispatch(event);
}

/**
 * Next probe delay, with full jitter.
 *
 * Without jitter every browser in every tab that was open during an outage
 * wakes at the same instant and retries in lockstep, which is how a recovering
 * backend gets knocked over by its own clients. Full jitter spreads the first
 * few probes thinly and only converges towards the ceiling on a long outage.
 */
function nextProbeDelay(): number {
  const index = Math.min(probeFailures, RECOVERY_PROBE_BACKOFF_MS.length - 1);
  const ceiling = RECOVERY_PROBE_BACKOFF_MS[index];
  return Math.round(Math.random() * ceiling);
}

/**
 * A probe passes only on 200 *and* the origin marker.
 *
 * Requiring both is deliberate. A Laravel 500 carries the marker but means the
 * application is broken, not absent, and should not read as recovery. A captive
 * portal's 200 has no marker and must not either.
 */
function probeResult(response: unknown): NetworkEvent | null {
  const axiosResponse = response as { status?: number } | null;

  const evidence = classifyResponse(axiosResponse as never);
  const isOk = axiosResponse?.status === 200;

  // A 200 counts as recovery when it is origin-marked, and also when this
  // deployment is known not to emit the marker (classifyResponse falls back to
  // `origin_ok` in that case). A marked non-200 still fails: a Laravel 500 means
  // broken, not absent, and must not read as recovery.
  if (evidence === 'origin_ok' && isOk) return { type: 'origin_ok' };

  return {
    type: 'confirmed',
    reason: reasonFromEvidence(evidence, axiosResponse?.status),
  };
}

/**
 * Issue one probe.
 *
 * Uses the base `Axios`, not the app instance from `lib/api/axios.ts`: the
 * probe must not touch the global loading counter, must not trigger a CSRF
 * cookie fetch, and must not re-enter the response interceptor that exists to
 * be informed by it. `validateStatus` accepts every status so that the response
 * can be classified by *who* answered rather than by whether axios threw.
 */
async function runProbe(): Promise<void> {
  try {
    const response = await Axios.get(PROBE_URL, {
      timeout: PROBE_TIMEOUT_MS,
      validateStatus: () => true,
      withCredentials: false,
      headers: { Accept: 'application/json' },
    });

    const outcome = probeResult(response);
    if (outcome) dispatch(outcome);

    // A passing probe resets the ladder so the next outage starts fast.
    if (outcome?.type === 'origin_ok') probeFailures = 0;
  } catch (error) {
    const evidence = classifyNetworkError(error);
    // A canceled probe says nothing about the connection.
    if (evidence !== 'canceled') {
      dispatch({ type: 'confirmed', reason: reasonFromEvidence(evidence) });
    }
    probeFailures += 1;
  }
}

/** Run a probe now, collapsing concurrent callers onto one in-flight request. */
function flushProbe(): Promise<void> {
  if (probeInFlight) return probeInFlight;

  // Order matters: the in-flight guard must be cleared *before* the next
  // attempt is armed. Rescheduling from inside `.then()` while `probeInFlight`
  // is still set makes `scheduleProbe` bail out, and probing would then stop
  // silently after the first failure.
  const pending = runProbe()
    .finally(() => {
      probeInFlight = null;
    })
    .then(() => {
      const { status, pendingConfirmation } = useNetworkStore.getState();
      // Keep probing only while still disconnected, or while a suspicion is
      // still waiting to be adjudicated.
      if (status !== 'online' || pendingConfirmation) scheduleProbe();
    });

  probeInFlight = pending;
  return pending;
}

/** Queue the next probe using the current backoff step. */
function scheduleProbe(): void {
  clearProbeTimer();
  if (!PROBE_ENABLED || probeInFlight) return;

  const { status, pendingConfirmation } = useNetworkStore.getState();
  if (status === 'online' && !pendingConfirmation) return;

  probeTimer = setTimeout(() => {
    probeTimer = null;
    void flushProbe();
  }, nextProbeDelay());
}

/**
 * Pause probing while the tab is hidden; probe once on the way back.
 *
 * A background tab asking "is the API up?" every second serves nobody: the
 * user cannot see the banner, and the answer becomes actionable only when they
 * return. Retrying the moment they do return is what they actually want.
 */
function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;

  if (document.visibilityState === 'hidden') {
    clearProbeTimer();
    return;
  }

  const { status, pendingConfirmation } = useNetworkStore.getState();
  if (status !== 'online' || pendingConfirmation) void flushProbe();
  else scheduleProbe();
}

/**
 * Re-read the browser's opinion and react: probe immediately if a connection
 * just came back (the user just toggled something, so they want data now),
 * otherwise stop probing.
 */
function reconcileWithBrowser(): void {
  dispatch(readInitialBrowserOnline() === false ? OFFLINE_EVENT : ONLINE_EVENT);

  // Re-read after dispatching: dispatch replaces the state object, so any field
  // captured beforehand would be a pre-transition value.
  if (useNetworkStore.getState().isOnline) {
    void flushProbe();
  } else {
    clearProbeTimer();
  }
}

const ONLINE_EVENT: NetworkEvent = { type: 'browser_online' };
const OFFLINE_EVENT: NetworkEvent = { type: 'browser_offline' };

/**
 * Attach browser listeners and read the initial state. Idempotent — safe to
 * call from a component that may mount more than once under StrictMode.
 */
export function startNetworkMonitoring(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  browserEventHandler = reconcileWithBrowser;
  window.addEventListener('online', browserEventHandler);
  window.addEventListener('offline', browserEventHandler);

  visibilityHandler = handleVisibilityChange;
  document.addEventListener('visibilitychange', visibilityHandler);

  // Watch every transition, whatever caused it, so the halves stay symmetric:
  //   - online → degraded arms the recovery probe. This is the path that matters
  //     most: suspect evidence from a failed *app request* is usually the first
  //     sign of an outage, and without this the server could come back while
  //     nothing was watching for it.
  //   - a new suspicion immediately triggers the confirmation probe, so the
  //     banner waits for verification instead of waiting for the backoff.
  //   - degraded → online notifies subscribers, exactly once per outage.
  unsubscribeStore = useNetworkStore.subscribe((state, previous) => {
    if (previous.status === 'online' && state.status !== 'online') {
      scheduleProbe();
      return;
    }
    if (!previous.pendingConfirmation && state.pendingConfirmation) {
      void flushProbe();
      return;
    }
    if (previous.status !== 'online' && state.status === 'online') {
      notifyRecovery();
    }
  });

  useNetworkStore.getState().setHydrated(true);

  // Tell the store what the browser thinks before the first probe, so an app
  // loaded inside a captive portal does not briefly claim to be online.
  dispatch(readInitialBrowserOnline() === false ? OFFLINE_EVENT : ONLINE_EVENT);

  if (useNetworkStore.getState().status !== 'online') scheduleProbe();
}

function readInitialBrowserOnline(): boolean | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.onLine !== false;
}

/** Detach listeners and cancel pending probes. */
export function stopNetworkMonitoring(): void {
  if (!started || typeof window === 'undefined') return;
  started = false;

  if (browserEventHandler) {
    window.removeEventListener('online', browserEventHandler);
    window.removeEventListener('offline', browserEventHandler);
    browserEventHandler = null;
  }

  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }

  unsubscribeStore?.();
  unsubscribeStore = null;
  clearProbeTimer();
  // A full teardown: forget the backoff so a later start begins at the fast
  // end of the ladder rather than inheriting a long-outage delay.
  probeFailures = 0;
}

/**
 * Force an immediate connectivity check.
 *
 * This is what the banner's "Retry" button calls: probe now, adjudicate now,
 * and report the answer. It is also the escape hatch for a UI that wants to
 * confirm recovery without waiting out a jittered backoff.
 */
export async function refreshNetworkStatus(): Promise<void> {
  if (typeof window === 'undefined') return;

  useNetworkStore.getState().setHydrated(true);
  dispatch(readInitialBrowserOnline() === false ? OFFLINE_EVENT : ONLINE_EVENT);

  if (!useNetworkStore.getState().isOnline) {
    clearProbeTimer();
    return;
  }

  await flushProbe();
}