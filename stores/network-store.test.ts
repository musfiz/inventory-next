import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNetworkStore } from './network-store';
import type { NetworkEvent, ServerReachability } from './network-store';

/** Drive `navigator.onLine`, which jsdom exposes as a getter. */
function setBrowserOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

const send = (event: NetworkEvent) => useNetworkStore.getState().dispatch(event);

describe('network-store', () => {
  beforeEach(() => {
    useNetworkStore.getState().reset();
    setBrowserOnline(true);
  });

  afterEach(() => {
    useNetworkStore.getState().reset();
  });

  it('starts optimistic so SSR and the first client render agree', () => {
    const state = useNetworkStore.getState();
    expect(state.status).toBe('online');
    expect(state.isOffline).toBe(false);
    expect(state.hydrated).toBe(false);
    expect(state.changedAt).toBeNull();
  });

  it('starts with reachability unknown, not reachable', () => {
    // Optimistic *appearance*, honest *knowledge*: nothing has been observed.
    expect(useNetworkStore.getState().reachability).toBe('unknown');
    expect(useNetworkStore.getState().isReachable).toBe(false);
  });

  it('tracks hydration explicitly', () => {
    useNetworkStore.getState().setHydrated(true);
    expect(useNetworkStore.getState().hydrated).toBe(true);
  });

  // ── The link ──────────────────────────────────────────────────────────────

  it('derives offline and no_link from a dropped connection', () => {
    send({ type: 'browser_offline' });

    const state = useNetworkStore.getState();
    expect(state.status).toBe('offline');
    expect(state.isOffline).toBe(true);
    expect(state.isOnline).toBe(false);
    expect(state.reason).toBe('no_link');
  });

  it('reports reachability as unknown, not false, while the link is down', () => {
    // The three-valued model exists for this. V1 had to spell "we do not know"
    // as `false`, which is how its "offline implies not reachable" invariant
    // ended up false in code.
    send({ type: 'origin_ok' });
    send({ type: 'browser_offline' });

    expect(useNetworkStore.getState().reachability).toBe('unknown');
    expect(useNetworkStore.getState().isReachable).toBe(false);
  });

  it('keeps isReachable false whenever the link is down', () => {
    send({ type: 'browser_offline' });
    expect(useNetworkStore.getState().isReachable).toBe(false);
  });

  // ── Verify before announce ────────────────────────────────────────────────

  it('does not announce an outage on suspicion alone', () => {
    send({ type: 'suspect', reason: 'timeout' });

    const state = useNetworkStore.getState();
    expect(state.status).toBe('online');
    expect(state.isOffline).toBe(false);
    // The probe is armed, though. That is the whole point of `suspect`.
    expect(state.pendingConfirmation).toBe(true);
  });

  it('announces once the failure is confirmed', () => {
    send({ type: 'suspect', reason: 'gateway' });
    send({ type: 'confirmed', reason: 'gateway' });

    const state = useNetworkStore.getState();
    expect(state.status).toBe('unreachable');
    expect(state.isOffline).toBe(true);
    expect(state.reason).toBe('gateway');
    expect(state.pendingConfirmation).toBe(false);
  });

  it('cancels a pending confirmation when origin is observed', () => {
    send({ type: 'suspect', reason: 'no_response' });
    send({ type: 'origin_ok' });

    const state = useNetworkStore.getState();
    expect(state.status).toBe('online');
    expect(state.reachability).toBe('reachable');
    expect(state.pendingConfirmation).toBe(false);
  });

  it('ignores a suspicion that arrives with no link', () => {
    send({ type: 'browser_offline' });
    send({ type: 'suspect', reason: 'no_response' });

    // A probe could not run, so arming one would be a lie.
    expect(useNetworkStore.getState().pendingConfirmation).toBe(false);
    expect(useNetworkStore.getState().status).toBe('offline');
  });

  it('keeps unreachable knowledge across a link blip', () => {
    send({ type: 'confirmed', reason: 'gateway' });
    send({ type: 'browser_offline' });
    send({ type: 'browser_online' });

    // The link came back; the backend did not. Claiming `online` here is the
    // single most misleading thing this store could do.
    const state = useNetworkStore.getState();
    expect(state.status).toBe('unreachable');
    expect(state.reachability).toBe('unreachable');
  });

  it('recovers only on a marked response, not on the link returning', () => {
    send({ type: 'confirmed', reason: 'no_response' });
    expect(useNetworkStore.getState().status).toBe('unreachable');

    // The browser knows about the link, not about Laravel.
    send({ type: 'browser_offline' });
    send({ type: 'browser_online' });
    expect(useNetworkStore.getState().status).toBe('unreachable');

    send({ type: 'origin_ok' });
    expect(useNetworkStore.getState().status).toBe('online');
  });

  it('returns to online without a banner when the link flickers while healthy', () => {
    send({ type: 'browser_offline' });
    send({ type: 'browser_online' });

    // No evidence of an outage, so none is announced. The engine probes
    // immediately and corrects this if Laravel is in fact down.
    expect(useNetworkStore.getState().status).toBe('online');
  });

  // ── origin_ok while the link is down ──────────────────────────────────────

  it('stays offline and does not move changedAt on origin while the link is down', () => {
    send({ type: 'browser_offline' });
    const before = useNetworkStore.getState().changedAt;

    send({ type: 'origin_ok' });

    const state = useNetworkStore.getState();
    expect(state.status).toBe('offline');
    expect(state.changedAt).toBe(before);
    expect(state.reason).toBe('no_link');
  });

  it('refuses to believe an origin response while the link is down', () => {
    send({ type: 'browser_offline' });
    send({ type: 'origin_ok' });

    // The invariant V1 documented and then broke: reachability went to `true`
    // from a response while `isOnline` was false, so the store claimed a
    // reachable server behind a dead link.
    const state = useNetworkStore.getState();
    expect(state.isOnline).toBe(false);
    expect(state.isReachable).toBe(false);
    expect(state.reachability).toBe('unknown');
  });

  // ── changedAt discipline ──────────────────────────────────────────────────

  it('leaves changedAt untouched when the status does not change', () => {
    send({ type: 'confirmed', reason: 'gateway' });
    const first = useNetworkStore.getState().changedAt;

    // Same outage, confirmed again. Re-stamping would un-dismiss the banner the
    // user already closed, every single time a request failed.
    send({ type: 'suspect', reason: 'gateway' });
    send({ type: 'confirmed', reason: 'gateway' });

    expect(useNetworkStore.getState().changedAt).toBe(first);
  });

  it('leaves changedAt untouched on duplicate browser events', () => {
    send({ type: 'browser_online' });
    const before = useNetworkStore.getState().changedAt;

    send({ type: 'browser_online' });
    expect(useNetworkStore.getState().changedAt).toBe(before);
  });

  it('advances changedAt on a real transition', () => {
    // changedAt is driven by Date.now(), so the clock is pinned. Without this,
    // every event below lands in the same millisecond and two distinct outages
    // become indistinguishable.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    try {
      send({ type: 'browser_offline' });
      const offlineAt = useNetworkStore.getState().changedAt;

      expect(offlineAt).not.toBeNull();

      vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
      send({ type: 'browser_online' });

      // Online again is a new outage boundary, so it gets a new stamp.
      expect(useNetworkStore.getState().changedAt).not.toBe(offlineAt);
    } finally {
      vi.useRealTimers();
    }
  });

  // ── Exhaustive invariants ─────────────────────────────────────────────────

  const ALL_EVENTS: NetworkEvent[] = [
    { type: 'browser_online' },
    { type: 'browser_offline' },
    { type: 'origin_ok' },
    { type: 'suspect', reason: 'no_response' },
    { type: 'suspect', reason: 'timeout' },
    { type: 'confirmed', reason: 'gateway' },
    { type: 'confirmed', reason: 'maintenance' },
  ];

  /** Every ordered sequence of `length` events. */
  function* sequences(length: number): Generator<NetworkEvent[]> {
    if (length === 0) {
      yield [];
      return;
    }
    for (const head of ALL_EVENTS) {
      for (const tail of sequences(length - 1)) yield [head, ...tail];
    }
  }

  it('holds every invariant across all event sequences', () => {
    let checked = 0;

    for (const sequence of sequences(3)) {
      useNetworkStore.getState().reset();

      for (const event of sequence) {
        const before = useNetworkStore.getState();
        send(event);
        const after = useNetworkStore.getState();

        const label = `${sequence.map(e => e.type).join(' → ')}` +
          ` (ending with ${event.type})`;

        // Derived flags can never drift from their sources.
        expect(after.isOffline, label).toBe(after.status !== 'online');
        expect(after.isReachable, label).toBe(after.reachability === 'reachable');

        // The invariant V1 documented and then broke.
        if (!after.isOnline) {
          expect(after.status, label).toBe('offline');
          expect(after.isReachable, label).toBe(false);
        }

        // Reachability is never `reachable` without the link.
        if (after.reachability === 'reachable' && !after.isOnline) {
          expect(after.status, label).toBe('offline');
        }

        // A pending confirmation is never visible as an outage, and never
        // exists while the status is already degraded.
        if (after.pendingConfirmation) {
          expect(after.status, label).toBe('online');
          expect(after.isOnline, label).toBe(true);
        }

        // changedAt moves only on a real status change.
        if (before.status === after.status) {
          expect(after.changedAt, label).toBe(before.changedAt);
        }

        checked += 1;
      }
    }

    expect(checked).toBeGreaterThan(300);
  });

  it('only ever reports one of the three public statuses', () => {
    const seen = new Set<string>();

    for (const sequence of sequences(3)) {
      useNetworkStore.getState().reset();
      for (const event of sequence) {
        send(event);
        seen.add(useNetworkStore.getState().status);
      }
    }

    expect([...seen].sort()).toEqual(['offline', 'online', 'unreachable']);
  });

  it('only ever reports one of the three reachability values', () => {
    const seen = new Set<ServerReachability>();

    for (const sequence of sequences(3)) {
      useNetworkStore.getState().reset();
      for (const event of sequence) {
        send(event);
        seen.add(useNetworkStore.getState().reachability);
      }
    }

    expect([...seen].sort()).toEqual(['reachable', 'unknown', 'unreachable']);
  });
});