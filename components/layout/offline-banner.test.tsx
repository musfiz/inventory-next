import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNetworkStore } from '@/stores/network-store';
import type { NetworkEvent, NetworkStatus } from '@/stores/network-store';
import type { NetworkReason } from '@/lib/api/network-error';
import OfflineBanner from './offline-banner';

const { refreshNetworkStatus } = vi.hoisted(() => ({
  refreshNetworkStatus: vi.fn(async () => {}),
}));

vi.mock('@/lib/api/network-monitor', () => ({
  refreshNetworkStatus,
}));

describe('OfflineBanner', () => {
  let now: number;

  beforeEach(() => {
    act(() => useNetworkStore.getState().reset());
    refreshNetworkStatus.mockClear();
    // Pin the clock: transitions stamp `changedAt` with Date.now(), and two
    // outages inside the same millisecond would look like one.
    now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Wrapped in act: the banner from this test is still mounted at this point
    // (RTL's auto-cleanup runs afterwards), and a store write would re-render
    // it outside act.
    act(() => useNetworkStore.getState().reset());
  });

  /**
   * Put the store into a settled degraded state, as the engine would.
   *
   * Note the `confirmed` event rather than a direct flag flip: an outage is
   * only ever announced after a probe has confirmed it.
   *
   * Wrapped in `act` because these are Zustand writes that a still-mounted
   * banner (from a previous render in this file) subscribes to — unwrapped they
   * produce act() warnings.
   */
  function goDegraded(status: NetworkStatus = 'unreachable', reason: NetworkReason = 'no_response') {
    act(() => {
      useNetworkStore.getState().setHydrated(true);

      if (status === 'offline') {
        useNetworkStore.getState().dispatch({ type: 'browser_offline' });
        return;
      }

      useNetworkStore.getState().dispatch({ type: 'suspect', reason });
      useNetworkStore.getState().dispatch({ type: 'confirmed', reason });
    });
  }

  it('renders nothing while connected', () => {
    act(() => useNetworkStore.getState().setHydrated(true));
    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing before the browser state has been read', () => {
    // Deliberately *not* via goDegraded(): this asserts the hydration gate, so
    // `hydrated` must stay false while the store already reports a failure.
    act(() =>
      useNetworkStore.getState().dispatch({ type: 'confirmed', reason: 'no_response' })
    );
    expect(useNetworkStore.getState().hydrated).toBe(false);

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unconfirmed suspicion', () => {
    // One failed request must never put a banner on screen.
    act(() => {
      useNetworkStore.getState().setHydrated(true);
      useNetworkStore.getState().dispatch({ type: 'suspect', reason: 'timeout' });
    });

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('distinguishes a dead connection from an unreachable server', () => {
    goDegraded('offline');
    const { unmount } = render(<OfflineBanner />);

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
    unmount();

    act(() => useNetworkStore.getState().reset());
    goDegraded('unreachable', 'no_response');
    render(<OfflineBanner />);

    expect(screen.getByText("Can't reach the server")).toBeInTheDocument();
    expect(screen.getByText(/connection is up/i)).toBeInTheDocument();
  });

  it('gives maintenance its own copy', () => {
    // Laravel serves maintenance before the HTTP kernel runs, so it can never
    // carry the origin marker. An unmarked 503 is positively maintenance rather
    // than guessed at, and the user should be told to wait rather than to
    // check their connection.
    goDegraded('unreachable', 'maintenance');

    render(<OfflineBanner />);

    expect(screen.getByText('Temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
  });

  it('keeps generic server copy for other gateway reasons', () => {
    goDegraded('unreachable', 'gateway');

    render(<OfflineBanner />);

    expect(screen.getByText("Can't reach the server")).toBeInTheDocument();
  });

  it('announces politely rather than interrupting', () => {
    goDegraded();
    render(<OfflineBanner />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('stays dismissed for the rest of the same outage', () => {
    goDegraded();
    const { container } = render(<OfflineBanner />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();

    // Another confirmed failure during the same outage must not resurrect it.
    // This is the case V1 got wrong: `changedAt` was re-stamped even though the
    // status had not changed, so the banner re-announced on every request.
    act(() => {
      now += 5_000;
      useNetworkStore.getState().dispatch({ type: 'confirmed', reason: 'no_response' });
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('re-announces a distinct later outage', () => {
    goDegraded();
    const { container } = render(<OfflineBanner />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();

    // Recover, then fail again — a new outage deserves a new warning.
    act(() => {
      useNetworkStore.getState().dispatch({ type: 'origin_ok' });
      now += 60_000;
      useNetworkStore.getState().dispatch({ type: 'confirmed', reason: 'no_response' });
    });

    expect(screen.getByText("Can't reach the server")).toBeInTheDocument();
  });

  it('reappears as soon as connectivity returns', () => {
    goDegraded();
    const { container } = render(<OfflineBanner />);
    expect(container).not.toBeEmptyDOMElement();

    act(() => {
      useNetworkStore.getState().dispatch({ type: 'origin_ok' });
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('re-checks connectivity on retry', async () => {
    goDegraded();
    render(<OfflineBanner />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });

    expect(refreshNetworkStatus).toHaveBeenCalledTimes(1);
  });

  it('labels retry as in-progress while the check runs', async () => {
    let resolveProbe: () => void = () => {};
    refreshNetworkStatus.mockImplementationOnce(
      () => new Promise<void>(resolve => (resolveProbe = resolve))
    );

    goDegraded();
    render(<OfflineBanner />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });
    expect(await screen.findByRole('button', { name: /checking/i })).toBeDisabled();

    // Settle the probe inside act so the button's pending state is flushed.
    await act(async () => {
      resolveProbe();
    });
    expect(await screen.findByRole('button', { name: /retry/i })).toBeEnabled();
  });
});