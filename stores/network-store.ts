'use client';

import { create } from 'zustand';
import type { NetworkReason } from '@/lib/api/network-error';

/**
 * Connectivity state, reduced from evidence.
 *
 * ## The model in one paragraph
 *
 * The browser never talks to Laravel directly — Next.js proxies `/api/*` to it.
 * So "something answered" is worthless as a liveness signal, and every rule
 * that treats any HTTP status as proof of health reports a dead backend as
 * fine. Two independent signals are tracked instead: the browser's own link
 * state, and whether a response carrying Laravel's origin marker was observed.
 *
 * ## Public surface (unchanged from V1, plus `reason`)
 *
 * `online` / `offline` / `unreachable` is the distinction a boolean gets wrong.
 * The two failures need different copy and different UI affordances:
 *
 * - `online`     — a link is up and nothing suggests otherwise.
 * - `offline`    — the browser reports no usable connection. Nothing was sent.
 * - `unreachable`— the link is up but requests are not reaching Laravel.
 *
 * `isOffline` is the derived convenience flag, `status !== 'online'`.
 *
 * ## What is new
 *
 * - **Reachability is three-valued.** `reachable` / `unreachable` / `unknown`.
 *   When the link is down we genuinely do not know about the server, and V1's
 *   two booleans forced that unknown to be spelled `false` — which is how its
 *   documented "offline implies not reachable" invariant ended up false in code.
 * - **`reason`** explains *why*, so the banner can say "the service is
 *   temporarily unavailable" instead of a generic "check your connection".
 * - **One reducer.** Every transition is one event through one pure function,
 *   so the invariants below are enforced in one place rather than re-derived
 *   in five mutators.
 */

/** What consumers see. The three values V1 exposed are unchanged. */
export type NetworkStatus = 'online' | 'offline' | 'unreachable';

/**
 * What is known about Laravel, which is not the same as what is known about
 * the link.
 *
 * `unknown` is the honest third state: no observation either way.
 */
export type ServerReachability = 'reachable' | 'unreachable' | 'unknown';

/**
 * Events the reducer accepts. Everything that can change connectivity is one
 * of these five things, which is what makes "one writer" achievable.
 *
 * Note that `suspect` and `confirmed` are separate events: one failed request
 * is a *suspicion*, and only a confirmation probe that also fails may announce
 * an outage. Collapsing them is what produced V1's false banners.
 */
export type NetworkEvent =
  | { type: 'browser_online' }
  | { type: 'browser_offline' }
  /** A response carrying Laravel's origin marker arrived. */
  | { type: 'origin_ok' }
  /** Suspect evidence seen. Arms a confirmation probe; changes nothing visible. */
  | { type: 'suspect'; reason: NetworkReason }
  /** The confirmation probe also failed. This is what announces an outage. */
  | { type: 'confirmed'; reason: NetworkReason };

/** The part of the store the reducer owns. `isOffline`/`isReachable` derive from it. */
interface Snapshot {
  isOnline: boolean;
  reachability: ServerReachability;
  status: NetworkStatus;
  reason: NetworkReason | null;
  changedAt: number | null;
  /** Engine-facing: a confirmation probe is owed. Never render this. */
  pendingConfirmation: boolean;
}

/** Store state: the reduced snapshot plus the fields derived from it. */
type NetworkData = Snapshot & {
  isOffline: boolean;
  isReachable: boolean;
  hydrated: boolean;
};

interface NetworkStore extends NetworkData {
  /** The single entry point for every state change. */
  dispatch: (event: NetworkEvent) => void;
  setHydrated: (hydrated?: boolean) => void;
  /** Reset to the pre-hydration defaults (tests, hard recovery). */
  reset: () => void;
}

/**
 * Read `navigator.onLine` without assuming a browser. Returns `null` during
 * SSR, where the property does not exist.
 */
export function readBrowserOnline(): boolean | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.onLine !== false;
}

/**
 * Resolve the public status from the two inputs.
 *
 * `unknown` maps to `online` on purpose. Reachability is unknown only while the
 * link is down, and on the way back up there is no evidence either way — and
 * announcing an outage from an absence of evidence is exactly the bug this
 * model exists to prevent. The engine probes immediately when the link
 * returns, so the real state arrives within one round trip.
 */
function deriveStatus(isOnline: boolean, reachability: ServerReachability): NetworkStatus {
  if (!isOnline) return 'offline';
  return reachability === 'unreachable' ? 'unreachable' : 'online';
}

/**
 * Attach the derived fields so the store cannot drift by construction:
 *
 * - `isOffline === (status !== 'online')`
 * - `isReachable === (reachability === 'reachable')`, which is false whenever
 *   the link is down — the invariant V1 documented but did not hold.
 */
function finalize(snapshot: Snapshot, hydrated: boolean): NetworkData {
  return {
    ...snapshot,
    isOffline: snapshot.status !== 'online',
    isReachable: snapshot.reachability === 'reachable',
    hydrated,
  };
}

/**
 * The single writer.
 *
 * Returns `null` when the event changes nothing, which keeps duplicate events
 * free no-ops and — critically — keeps `changedAt` from moving when the status
 * did not actually change. `changedAt` identifies an outage for banner
 * dismissal, so re-stamping it during one outage would silently un-dismiss the
 * banner the user had closed.
 */
function reduce(snapshot: Snapshot, event: NetworkEvent): Snapshot | null {
  switch (event.type) {
    case 'browser_offline': {
      if (!snapshot.isOnline) return null;

      // `unreachable` is *confirmed* knowledge, learned from a real failed
      // probe, not link-level knowledge. A Wi-Fi blip cannot erase it, so it is
      // deliberately preserved — otherwise "Wi-Fi off, backend still down, Wi-Fi
      // on" would flip to `online` and claim a dead backend was healthy.
      // `reachable` is weaker and does lapse, because a link that just died
      // genuinely tells us nothing about the server any more.
      const reachability: ServerReachability =
        snapshot.reachability === 'unreachable' ? 'unreachable' : 'unknown';

      return {
        ...snapshot,
        isOnline: false,
        reachability,
        status: 'offline',
        reason: 'no_link',
        // A confirmation probe cannot complete without a link.
        pendingConfirmation: false,
        changedAt: Date.now(),
      };
    }

    case 'browser_online': {
      if (snapshot.isOnline) return null;

      // Reachability is left exactly as it was. Turning the link on proves the
      // link works, not that Laravel came back — only a marked response can
      // say that.
      const status = deriveStatus(true, snapshot.reachability);

      return {
        ...snapshot,
        isOnline: true,
        status,
        reason: status === 'online' ? null : snapshot.reason,
        changedAt: Date.now(),
      };
    }

    case 'origin_ok': {
      // An origin response arriving while the browser insists there is no link
      // is deliberately ignored entirely.
      //
      // Reachability is `unknown` whenever the link is down, and that rule is
      // not negotiable — it is what keeps "offline implies not reachable" true.
      // Believing the marker here is precisely the V1 bug: it set reachability
      // from a response while `isOnline` was false, leaving the store claiming
      // a reachable server behind a dead link.
      //
      // Nothing is lost by ignoring it. The link event will fire, and the next
      // genuine response re-confirms reachability.
      if (!snapshot.isOnline) return null;

      const status = deriveStatus(true, 'reachable');

      return {
        ...snapshot,
        reachability: 'reachable',
        status,
        reason: null,
        pendingConfirmation: false,
        changedAt: status === snapshot.status ? snapshot.changedAt : Date.now(),
      };
    }

    case 'suspect': {
      // With no link there is nothing to confirm — the probe would fail for
      // the wrong reason and could be mistaken for the backend being down.
      if (!snapshot.isOnline) return null;
      if (snapshot.pendingConfirmation) return null;
      if (snapshot.status !== 'online') return null;

      return {
        ...snapshot,
        pendingConfirmation: true,
        // `reason` is intentionally left alone: the status has not changed, so
        // nothing new should be announced yet.
      };
    }

    case 'confirmed': {
      if (!snapshot.isOnline) {
        // The link is down, so the user is offline regardless. The knowledge
        // that Laravel is also unreachable is kept for when the link returns.
        if (snapshot.reachability === 'unreachable') return null;
        return {
          ...snapshot,
          reachability: 'unreachable',
          pendingConfirmation: false,
        };
      }

      const status = deriveStatus(true, 'unreachable');
      if (status === snapshot.status && snapshot.reachability === 'unreachable') return null;

      return {
        ...snapshot,
        reachability: 'unreachable',
        status,
        reason: event.reason,
        pendingConfirmation: false,
        changedAt: status === snapshot.status ? snapshot.changedAt : Date.now(),
      };
    }

    default:
      return null;
  }
}

/**
 * Optimistic defaults, so the server render and the first client render agree.
 * `hydrated` stays false until the client has read `navigator.onLine`, which is
 * why components gate on it rather than on `isOffline`.
 */
const INITIAL_SNAPSHOT: Snapshot = {
  isOnline: true,
  reachability: 'unknown',
  status: 'online',
  reason: null,
  changedAt: null,
  pendingConfirmation: false,
};

export const useNetworkStore = create<NetworkStore>()((set, get) => ({
  ...finalize(INITIAL_SNAPSHOT, false),

  dispatch: (event: NetworkEvent) => {
    const current = get();
    const next = reduce(current, event);
    if (next === null) return;
    set(finalize(next, current.hydrated));
  },

  setHydrated: (hydrated = true) => set({ hydrated }),

  reset: () => set(finalize(INITIAL_SNAPSHOT, false)),
}));

/** Non-reactive read for the axios interceptor and other non-React callers. */
export const getNetworkState = () => useNetworkStore.getState();

export default useNetworkStore;