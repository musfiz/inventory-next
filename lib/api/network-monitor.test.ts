import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  refreshNetworkStatus,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  subscribeNetworkRecovery,
} from './network-monitor';
import { ORIGIN_HEADER, ORIGIN_VALUE } from './network-error';
import { useNetworkStore } from '@/stores/network-store';
import type { NetworkEvent } from '@/stores/network-store';

// The probe must use the base `Axios` (not the app instance) so it does not
// touch the loading counter or re-enter the response interceptor.
const { axiosGet } = vi.hoisted(() => ({ axiosGet: vi.fn() }));

vi.mock('axios', () => ({ default: { get: axiosGet } }));

function setBrowserOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

/** Set the browser link state without dispatching the event. */
function flipLink(online: boolean) {
  setBrowserOnline(online);
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** A healthy probe response: 200 carrying Laravel's origin marker. */
const HEALTHY = { status: 200, data: { status: 'ok' }, headers: { [ORIGIN_HEADER]: ORIGIN_VALUE } };

const send = (event: NetworkEvent) => useNetworkStore.getState().dispatch(event);

describe('network-monitor', () => {
  beforeEach(() => {
    stopNetworkMonitoring();
    useNetworkStore.getState().reset();
    setBrowserOnline(true);
    setVisibility('visible');
    axiosGet.mockReset();
    axiosGet.mockResolvedValue(HEALTHY);
  });

  afterEach(() => {
    stopNetworkMonitoring();
    useNetworkStore.getState().reset();
    vi.useRealTimers();
  });

  it('reads the browser state when it starts', () => {
    setBrowserOnline(false);

    startNetworkMonitoring();

    const state = useNetworkStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.status).toBe('offline');
  });

  it('registers listeners only once, even if started repeatedly', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    startNetworkMonitoring();
    startNetworkMonitoring();

    const onlineAdds = addSpy.mock.calls.filter(([type]) => type === 'online');
    expect(onlineAdds).toHaveLength(1);
  });

  it('detaches listeners when stopped', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    startNetworkMonitoring();
    stopNetworkMonitoring();

    const onlineRemoves = removeSpy.mock.calls.filter(([type]) => type === 'online');
    expect(onlineRemoves).toHaveLength(1);
  });

  it('goes offline from the browser event', () => {
    startNetworkMonitoring();

    flipLink(false);

    expect(useNetworkStore.getState().status).toBe('offline');
    expect(useNetworkStore.getState().isOffline).toBe(true);
  });

  // ── Verify, then announce ────────────────────────────────────────────────

  it('never shows a banner for a single failure that a probe then clears', async () => {
    startNetworkMonitoring();

    // The suspicion: one slow or flaky request.
    send({ type: 'suspect', reason: 'timeout' });
    expect(useNetworkStore.getState().status).toBe('online');

    // The confirmation finds Laravel perfectly well.
    await vi.waitFor(() => expect(axiosGet).toHaveBeenCalled());

    expect(useNetworkStore.getState().status).toBe('online');
    expect(useNetworkStore.getState().isOffline).toBe(false);
  });

  it('confirms an outage only after the probe also fails', async () => {
    startNetworkMonitoring();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });

    send({ type: 'suspect', reason: 'no_response' });
    await vi.waitFor(() => expect(useNetworkStore.getState().status).toBe('unreachable'));

    expect(useNetworkStore.getState().reason).toBe('no_response');
  });

  it('probes the confirmation immediately rather than after the backoff', async () => {
    startNetworkMonitoring();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });

    // No timer advancing: the confirmation must not wait on the ladder.
    send({ type: 'suspect', reason: 'gateway' });
    expect(axiosGet).toHaveBeenCalledTimes(1);
  });

  it('probes the health route, not an authenticated business endpoint', async () => {
    startNetworkMonitoring();
    await refreshNetworkStatus();

    // /api/v1/user would make every probe a logged 401.
    expect(axiosGet).toHaveBeenCalledWith('/api/v1/health', expect.anything());
  });

  it('probes without credentials, so a broken session cannot fail it', async () => {
    startNetworkMonitoring();
    await refreshNetworkStatus();

    const [, config] = axiosGet.mock.calls[0];
    expect(config.withCredentials).toBe(false);
  });

  // ── What counts as an answer ──────────────────────────────────────────────

  it('treats an unmarked 200 as a failed check, not as recovery', async () => {
    startNetworkMonitoring();
    send({ type: 'confirmed', reason: 'no_response' });

    // A captive portal answering every URL with 200 HTML.
    axiosGet.mockResolvedValueOnce({ status: 200, data: '<html>hotel wifi</html>', headers: {} });
    await refreshNetworkStatus();

    expect(useNetworkStore.getState().status).toBe('unreachable');
  });

  it('does not treat a marked 500 as recovery', async () => {
    startNetworkMonitoring();
    send({ type: 'confirmed', reason: 'no_response' });

    // Laravel is there but broken. The probe requires 200 *and* the marker.
    axiosGet.mockResolvedValueOnce({
      status: 500,
      data: { message: 'boom' },
      headers: { [ORIGIN_HEADER]: ORIGIN_VALUE },
    });
    await refreshNetworkStatus();

    expect(useNetworkStore.getState().status).toBe('unreachable');
  });

  it('recovers on a marked 200', async () => {
    startNetworkMonitoring();
    send({ type: 'confirmed', reason: 'no_response' });
    expect(useNetworkStore.getState().status).toBe('unreachable');

    axiosGet.mockResolvedValueOnce(HEALTHY);
    await refreshNetworkStatus();

    const state = useNetworkStore.getState();
    expect(state.status).toBe('online');
    expect(state.reachability).toBe('reachable');
    expect(state.reason).toBeNull();
  });

  it('reports maintenance from an unmarked 503', async () => {
    startNetworkMonitoring();

    axiosGet.mockResolvedValueOnce({ status: 503, data: 'Service Unavailable', headers: {} });
    await refreshNetworkStatus();

    const state = useNetworkStore.getState();
    expect(state.status).toBe('unreachable');
    expect(state.reason).toBe('maintenance');
  });

  it('enters unreachable when the probe cannot connect', async () => {
    startNetworkMonitoring();
    axiosGet.mockRejectedValueOnce({ isAxiosError: true, code: 'ERR_NETWORK' });

    await refreshNetworkStatus();

    const state = useNetworkStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.status).toBe('unreachable');
  });

  it('ignores a canceled probe', async () => {
    startNetworkMonitoring();
    send({ type: 'confirmed', reason: 'gateway' });

    axiosGet.mockRejectedValueOnce({ isAxiosError: true, code: 'ERR_CANCELED' });
    await refreshNetworkStatus();

    // A canceled probe says nothing about the connection.
    expect(useNetworkStore.getState().reason).toBe('gateway');
  });

  it('does not probe while the browser reports no connection', async () => {
    setBrowserOnline(false);
    startNetworkMonitoring();
    axiosGet.mockClear();

    await refreshNetworkStatus();

    expect(axiosGet).not.toHaveBeenCalled();
  });

  // ── Recovery notification ─────────────────────────────────────────────────

  it('notifies subscribers once per offline → online transition', async () => {
    const onRecovery = vi.fn();
    const unsubscribe = subscribeNetworkRecovery(onRecovery);

    startNetworkMonitoring();

    flipLink(false);
    expect(onRecovery).not.toHaveBeenCalled();

    flipLink(true);
    await vi.waitFor(() => expect(onRecovery).toHaveBeenCalledTimes(1));

    // Already recovered: staying online is not a new transition.
    send({ type: 'origin_ok' });
    expect(onRecovery).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not re-announce repeated failures within one outage', async () => {
    vi.useFakeTimers();
    const onRecovery = vi.fn();
    subscribeNetworkRecovery(onRecovery);

    startNetworkMonitoring();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });

    send({ type: 'suspect', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(0);
    expect(useNetworkStore.getState().status).toBe('unreachable');

    // More failures inside the same outage. No announcement, no new stamp.
    const stamp = useNetworkStore.getState().changedAt;
    send({ type: 'confirmed', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(useNetworkStore.getState().changedAt).toBe(stamp);
    expect(onRecovery).not.toHaveBeenCalled();

    // Recovering notifies exactly once for this outage.
    axiosGet.mockResolvedValue(HEALTHY);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(useNetworkStore.getState().status).toBe('online');
    expect(onRecovery).toHaveBeenCalledTimes(1);

    // A genuinely new outage, then a genuinely new recovery: the second one is
    // a second notification, not a duplicate of the first.
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    send({ type: 'suspect', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(0);
    expect(useNetworkStore.getState().status).toBe('unreachable');

    axiosGet.mockResolvedValue(HEALTHY);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onRecovery).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', async () => {
    const onRecovery = vi.fn();
    const unsubscribe = subscribeNetworkRecovery(onRecovery);
    unsubscribe();

    startNetworkMonitoring();
    flipLink(false);
    flipLink(true);
    await vi.waitFor(() => expect(useNetworkStore.getState().status).toBe('online'));

    expect(onRecovery).not.toHaveBeenCalled();
  });

  it('does not fire recovery for the very first healthy render', async () => {
    const onRecovery = vi.fn();
    subscribeNetworkRecovery(onRecovery);

    startNetworkMonitoring();

    // Nothing was lost, so nothing was recovered — mounting must not trigger
    // a revalidation burst.
    expect(onRecovery).not.toHaveBeenCalled();
  });

  // ── Probing schedule ──────────────────────────────────────────────────────

  it('keeps probing with backoff while the server stays down', async () => {
    vi.useFakeTimers();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });

    startNetworkMonitoring();
    send({ type: 'suspect', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(0);
    const callsAfterConfirmation = axiosGet.mock.calls.length;

    // Each subsequent attempt backs off rather than hammering a dead server.
    const seen = new Set<number>();
    for (let i = 0; i < 5; i += 1) {
      const before = axiosGet.mock.calls.length;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(axiosGet.mock.calls.length).toBeGreaterThan(before);
      seen.add(axiosGet.mock.calls.length - before);
    }

    expect(callsAfterConfirmation).toBeGreaterThan(0);
    expect(useNetworkStore.getState().status).toBe('unreachable');
    expect(seen.size).toBeGreaterThan(0);
  });

  it('keeps every jittered delay inside its ladder ceiling', async () => {
    // Full jitter puts the delay anywhere in [0, ceiling]. At the very top of
    // that range the probe must still fire within the ceiling — never later,
    // or an outage would take twice as long to notice.
    vi.useFakeTimers();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);

    try {
      startNetworkMonitoring();
      send({ type: 'suspect', reason: 'no_response' });
      await vi.advanceTimersByTimeAsync(0);
      expect(axiosGet).toHaveBeenCalledTimes(1);

      // First ladder ceiling after the confirmation attempt is 5s.
      await vi.advanceTimersByTimeAsync(5_000);
      expect(axiosGet).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(15_000);
      expect(axiosGet).toHaveBeenCalledTimes(3);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('spreads probes with jitter rather than firing them in lockstep', async () => {
    // Without jitter, every browser in every tab open during an outage wakes at
    // the same instant and retries together, knocking over the backend with the
    // recovering server's own clients.
    vi.useFakeTimers();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    let call = 0;
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      call += 1;
      return call % 2 === 0 ? 0.9 : 0.1;
    });

    try {
      startNetworkMonitoring();
      send({ type: 'suspect', reason: 'no_response' });

      for (let i = 0; i < 5; i += 1) {
        await vi.advanceTimersToNextTimerAsync();
      }

      const probeDelays = setTimeoutSpy.mock.calls
        .map(callArgs => callArgs[1])
        .filter((delay): delay is number => typeof delay === 'number' && delay <= 60_000);

      expect(probeDelays.length).toBeGreaterThan(1);
      // Consecutive delays differ, so clients do not converge on one instant.
      expect(new Set(probeDelays).size).toBeGreaterThan(1);
    } finally {
      randomSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    }
  });

  it('issues no background requests while healthy', async () => {
    vi.useFakeTimers();
    startNetworkMonitoring();
    expect(useNetworkStore.getState().status).toBe('online');
    axiosGet.mockClear();

    // No heartbeat: an outage is already visible in the response path, and a
    // timer-driven probe would double backend load for no new information.
    await vi.advanceTimersByTimeAsync(300_000);

    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('stops probing once the server recovers', async () => {
    vi.useFakeTimers();
    startNetworkMonitoring();

    axiosGet.mockRejectedValueOnce({ isAxiosError: true, code: 'ERR_NETWORK' });
    send({ type: 'suspect', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(0);
    expect(useNetworkStore.getState().status).toBe('unreachable');

    axiosGet.mockResolvedValue(HEALTHY);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(useNetworkStore.getState().status).toBe('online');

    axiosGet.mockClear();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('pauses probing while the tab is hidden and resumes on return', async () => {
    vi.useFakeTimers();
    startNetworkMonitoring();

    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    send({ type: 'suspect', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(0);
    expect(useNetworkStore.getState().status).toBe('unreachable');

    setVisibility('hidden');
    axiosGet.mockClear();

    // A background tab asking "is the API up?" serves nobody.
    await vi.advanceTimersByTimeAsync(300_000);
    expect(axiosGet).not.toHaveBeenCalled();

    // On return the user wants data now.
    setVisibility('visible');
    expect(axiosGet).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent refreshes onto a single probe', async () => {
    let resolveProbe: (value: unknown) => void = () => {};
    axiosGet.mockImplementationOnce(() => new Promise(resolve => (resolveProbe = resolve)));

    startNetworkMonitoring();

    const first = refreshNetworkStatus();
    const second = refreshNetworkStatus();
    resolveProbe(HEALTHY);
    await Promise.all([first, second]);

    expect(axiosGet).toHaveBeenCalledTimes(1);
  });

  it('probes immediately when the link returns', async () => {
    startNetworkMonitoring();
    flipLink(false);
    axiosGet.mockClear();

    flipLink(true);

    expect(axiosGet).toHaveBeenCalledTimes(1);
  });

  it('does not leave a probe scheduled after being stopped', async () => {
    vi.useFakeTimers();
    axiosGet.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });

    startNetworkMonitoring();
    send({ type: 'suspect', reason: 'no_response' });
    await vi.advanceTimersByTimeAsync(0);

    stopNetworkMonitoring();
    axiosGet.mockClear();
    await vi.advanceTimersByTimeAsync(300_000);

    expect(axiosGet).not.toHaveBeenCalled();
  });
});