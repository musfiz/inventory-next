import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNetworkStore } from '@/stores/network-store';
import type { NetworkEvent } from '@/stores/network-store';
import { useOffline } from './use-offline';

// The monitor module owns real DOM listeners and timers; the hook only needs to
// delegate to it, so it is stubbed here and covered on its own terms.
const { refreshNetworkStatus } = vi.hoisted(() => ({
  refreshNetworkStatus: vi.fn(async () => {}),
}));

vi.mock('@/lib/api/network-monitor', () => ({
  refreshNetworkStatus,
}));

const send = (event: NetworkEvent) =>
  act(() => {
    useNetworkStore.getState().dispatch(event);
  });

describe('useOffline', () => {
  beforeEach(() => {
    // Wrapped in act: the hook from the previous test is still mounted until
    // RTL's auto-cleanup, and resetting the store re-renders it.
    act(() => useNetworkStore.getState().reset());
    refreshNetworkStatus.mockClear();
  });

  afterEach(() => {
    act(() => useNetworkStore.getState().reset());
  });

  it('reports online before the browser state has been read', () => {
    // The optimistic default, so a server render never claims "offline".
    const { result } = renderHook(() => useOffline());

    expect(result.current.isOffline).toBe(false);
    expect(result.current.hydrated).toBe(false);
    expect(result.current.status).toBe('online');
  });

  it('exposes the tri-state alongside the combined flag', () => {
    act(() => useNetworkStore.getState().setHydrated(true));
    send({ type: 'suspect', reason: 'no_response' });
    send({ type: 'confirmed', reason: 'no_response' });

    const { result } = renderHook(() => useOffline());

    // The distinction that matters: the browser still claims to be online.
    expect(result.current.status).toBe('unreachable');
    expect(result.current.isOffline).toBe(true);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isReachable).toBe(false);
  });

  it('exposes the reason behind a degraded state', () => {
    act(() => useNetworkStore.getState().setHydrated(true));
    send({ type: 'suspect', reason: 'gateway' });
    send({ type: 'confirmed', reason: 'maintenance' });

    const { result } = renderHook(() => useOffline());

    // Drives the banner's third copy variant.
    expect(result.current.reason).toBe('maintenance');
  });

  it('exposes three-valued reachability, not a boolean', () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current.reachability).toBe('unknown');

    send({ type: 'origin_ok' });
    expect(result.current.reachability).toBe('reachable');

    send({ type: 'browser_offline' });
    expect(result.current.reachability).toBe('unknown');
  });

  it('does not report an outage while a suspicion is unconfirmed', () => {
    act(() => useNetworkStore.getState().setHydrated(true));
    send({ type: 'suspect', reason: 'timeout' });

    const { result } = renderHook(() => useOffline());

    // One slow report is not an outage.
    expect(result.current.isOffline).toBe(false);
    expect(result.current.status).toBe('online');
  });

  it('re-renders subscribers when connectivity changes', () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current.isOffline).toBe(false);

    act(() => useNetworkStore.getState().setHydrated(true));
    send({ type: 'suspect', reason: 'no_response' });
    send({ type: 'confirmed', reason: 'no_response' });
    expect(result.current.isOffline).toBe(true);

    send({ type: 'origin_ok' });
    expect(result.current.isOffline).toBe(false);
  });

  it('shares one source of truth across callers', () => {
    const first = renderHook(() => useOffline());
    const second = renderHook(() => useOffline());

    act(() => useNetworkStore.getState().setHydrated(true));
    send({ type: 'suspect', reason: 'no_response' });
    send({ type: 'confirmed', reason: 'no_response' });

    expect(first.result.current.isOffline).toBe(true);
    expect(second.result.current.isOffline).toBe(true);
  });

  it('surfaces the change timestamp', () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current.changedAt).toBeNull();

    send({ type: 'suspect', reason: 'no_response' });
    send({ type: 'confirmed', reason: 'no_response' });

    expect(result.current.changedAt).toEqual(expect.any(Number));
  });

  // ── Gating writes ─────────────────────────────────────────────────────────

  it('permits blocking writes only when the browser says there is no link', () => {
    const { result } = renderHook(() => useOffline());

    // The one case strong enough to gate on: the browser itself is saying
    // nothing can be sent.
    send({ type: 'browser_offline' });
    expect(result.current.canBlockWrites).toBe(true);

    send({ type: 'browser_online' });
    send({ type: 'suspect', reason: 'no_response' });
    send({ type: 'confirmed', reason: 'no_response' });
    expect(result.current.canBlockWrites).toBe(false);
  });

  it('forbids blocking writes on an unreachable server', () => {
    act(() => useNetworkStore.getState().setHydrated(true));
    send({ type: 'suspect', reason: 'gateway' });
    send({ type: 'confirmed', reason: 'gateway' });

    const { result } = renderHook(() => useOffline());

    // Confirmed by a probe, but still a conclusion about a server rather than
    // the local link. The request will fail fast if it is real.
    expect(result.current.status).toBe('unreachable');
    expect(result.current.canBlockWrites).toBe(false);
  });

  // ── Delegation ────────────────────────────────────────────────────────────

  it('delegates refresh to the connectivity engine', async () => {
    const { result } = renderHook(() => useOffline());

    await act(async () => {
      await result.current.refresh();
    });

    expect(refreshNetworkStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable refresh identity across renders', () => {
    const { result, rerender } = renderHook(() => useOffline());
    const first = result.current.refresh;

    rerender();

    expect(result.current.refresh).toBe(first);
  });
});