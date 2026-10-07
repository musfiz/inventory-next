import { beforeEach, describe, expect, it } from 'vitest';
import {
  ORIGIN_HEADER,
  ORIGIN_VALUE,
  classifyNetworkError,
  classifyResponse,
  describeNetworkError,
  getMarkerSupport,
  hasOriginMarker,
  isCanceledRequest,
  isSuspectEvidence,
  isTimeoutError,
  reasonFromEvidence,
  resetMarkerSupport,
} from './network-error';

/** A response as Laravel stamps it: any status, always marked. */
function fromLaravel(status: number, data: unknown = {}) {
  return { status, data, headers: { [ORIGIN_HEADER]: ORIGIN_VALUE } };
}

/** A response from something in front of Laravel, or from nothing at all. */
function fromGateway(status: number, data: unknown = '<html>Bad Gateway</html>') {
  return { status, data, headers: {} };
}

function axiosError(overrides: Record<string, unknown>) {
  return { isAxiosError: true, ...overrides } as unknown;
}

describe('network-error: origin detection', () => {
  it('recognises the marker in a plain object', () => {
    expect(hasOriginMarker({ [ORIGIN_HEADER]: ORIGIN_VALUE })).toBe(true);
  });

  it('recognises the marker in a lowercase key', () => {
    // HTTP header names are case-insensitive; the marker spelling must not
    // decide whether a response counts as origin.
    expect(hasOriginMarker({ 'x-api-origin': ORIGIN_VALUE })).toBe(true);
  });

  it('recognises the marker through an AxiosHeaders-style accessor', () => {
    // axios v1 exposes AxiosHeaders, whose values are read via .get().
    const headers = { get: (name: string) => (name === ORIGIN_HEADER ? ORIGIN_VALUE : null) };
    expect(hasOriginMarker(headers)).toBe(true);
  });

  it('survives a header accessor that throws', () => {
    const headers = {
      get: () => {
        throw new Error('boom');
      },
    };
    expect(hasOriginMarker(headers)).toBe(false);
  });

  it('rejects a wrong marker value', () => {
    expect(hasOriginMarker({ [ORIGIN_HEADER]: 'wordpress' })).toBe(false);
    expect(hasOriginMarker({ [ORIGIN_HEADER]: '' })).toBe(false);
  });

  it('handles missing headers', () => {
    expect(hasOriginMarker(undefined)).toBe(false);
    expect(hasOriginMarker(null)).toBe(false);
  });
});

describe('network-error: marker-support learning', () => {
  // Marker support is module-level learned state, so these tests reset it.
  beforeEach(() => resetMarkerSupport());

  it('starts unknown, so the first unmarked response is judged on its own', () => {
    expect(getMarkerSupport()).toBe('unknown');
    expect(classifyResponse({ status: 200, data: { ok: true }, headers: {} })).toBe('foreign');
  });

  it('learns that a deployment has no marker from well-formed API JSON', () => {
    // Rollout safety: a frontend shipped before the backend marker would
    // otherwise read every healthy response as foreign and show a permanent
    // outage banner.
    classifyResponse({ status: 200, data: { ok: true }, headers: {} });

    expect(getMarkerSupport()).toBe('absent');
    // Having learned the backend is un-upgraded, fall back to status rules.
    expect(classifyResponse({ status: 200, data: { ok: true }, headers: {} })).toBe('origin_ok');
    expect(classifyResponse({ status: 401, data: { message: 'Unauthenticated.' }, headers: {} })).toBe(
      'origin_ok'
    );
  });

  it('does not let the teaching response reclassify itself', () => {
    // The response that reveals a marker-less deployment must still be judged
    // strictly. One unauthenticated JSON body is a weaker signal than the
    // marker itself, and `foreign` is neutral for app requests, so the strict
    // reading costs nothing.
    expect(classifyResponse({ status: 200, data: { ok: true }, headers: {} })).toBe('foreign');
    expect(getMarkerSupport()).toBe('absent');
  });

  it('still fails a marked-less deployment on gateway statuses', () => {
    classifyResponse({ status: 200, data: { ok: true }, headers: {} });

    // The fallback trusts *JSON shape*, not status alone: a proxy 502 is still an
    // outage, because it is a different body from the app's.
    expect(classifyResponse({ status: 502, data: { error: 'bad gateway' }, headers: {} })).toBe(
      'gateway_failure'
    );
    expect(classifyResponse({ status: 503, data: { error: 'maintenance' }, headers: {} })).toBe(
      'gateway_failure'
    );
  });

  it('does not learn absence from a captive portal HTML page', () => {
    // HTML is exactly what a stranger serves, so it proves nothing about the
    // backend's marker support. Learning 'absent' here would let a real backend
    // later be read as healthy on the strength of a portal page.
    classifyResponse({ status: 200, data: '<html>Sign in</html>', headers: {} });

    expect(getMarkerSupport()).toBe('unknown');
  });

  it('treats marker presence as sticky and authoritative', () => {
    classifyResponse({ status: 200, data: {}, headers: { [ORIGIN_HEADER]: ORIGIN_VALUE } });
    expect(getMarkerSupport()).toBe('present');

    // Once any response has carried the marker, an unmarked one is a stranger.
    expect(classifyResponse({ status: 200, data: { ok: true }, headers: {} })).toBe('foreign');
    expect(getMarkerSupport()).toBe('present');
  });

  it('lets a real marker overturn an earlier absence', () => {
    classifyResponse({ status: 200, data: { ok: true }, headers: {} });
    expect(getMarkerSupport()).toBe('absent');

    // The backend was upgraded while the tab was open. Trust the marker.
    classifyResponse({ status: 200, data: {}, headers: { [ORIGIN_HEADER]: ORIGIN_VALUE } });

    expect(getMarkerSupport()).toBe('present');
    expect(classifyResponse({ status: 200, data: { ok: true }, headers: {} })).toBe('foreign');
  });
});

describe('network-error: response classification', () => {
  it('treats any marked status as origin', () => {
    // Including 401, 404, 422 and 500. These are Laravel answering — a server
    // problem to report, never an outage to announce.
    for (const status of [200, 204, 401, 403, 404, 422, 500]) {
      expect(classifyResponse(fromLaravel(status))).toBe('origin_ok');
    }
  });

  it('treats an unmarked 500 with a JSON body as origin', () => {
    // Defensive only: a Laravel 500 should carry the marker. If it does not,
    // a JSON body is still evidence of Laravel rather than of a proxy.
    expect(classifyResponse({ status: 500, data: { message: 'boom' }, headers: {} })).toBe(
      'foreign'
    );
  });

  it('treats proxy 502, 503 and 504 as gateway failures', () => {
    for (const status of [502, 503, 504]) {
      expect(classifyResponse(fromGateway(status))).toBe('gateway_failure');
    }
  });

  it('treats an unmarked non-JSON 5xx as a gateway failure', () => {
    // An HTML error page did not come from this application.
    expect(classifyResponse(fromGateway(500))).toBe('gateway_failure');
    expect(classifyResponse(fromGateway(502))).toBe('gateway_failure');
  });

  it('treats a captive portal page as foreign, not as health', () => {
    // The case the whole origin marker exists for: something answers, it is
    // just not Laravel.
    const captivePortal = {
      status: 200,
      data: '<html><body>Sign in to the hotel Wi-Fi</body></html>',
      headers: {},
    };
    expect(classifyResponse(captivePortal)).toBe('foreign');
  });

  it('treats a Next.js route answering for the API as foreign', () => {
    expect(classifyResponse({ status: 404, data: { error: 'Not found' }, headers: {} })).toBe(
      'foreign'
    );
  });

  it('reports no response for a missing response object', () => {
    expect(classifyResponse(null)).toBe('no_response');
    expect(classifyResponse(undefined)).toBe('no_response');
  });
});

describe('network-error: thrown value classification', () => {
  it('classifies a transport failure as no_response', () => {
    const error = axiosError({ code: 'ERR_NETWORK', message: 'Network Error' });
    expect(classifyNetworkError(error)).toBe('no_response');
  });

  it('classifies a timeout as timeout', () => {
    expect(classifyNetworkError(axiosError({ code: 'ECONNABORTED' }))).toBe('timeout');
    expect(classifyNetworkError(axiosError({ code: 'ETIMEDOUT' }))).toBe('timeout');
  });

  it('classifies an aborted request as canceled', () => {
    // Route changes and unmounts abort constantly; treating those as outages
    // flashes the banner on every navigation.
    expect(classifyNetworkError(axiosError({ code: 'ERR_CANCELED' }))).toBe('canceled');
  });

  it('routes a response-bearing error through response classification', () => {
    expect(
      classifyNetworkError(axiosError({ response: fromLaravel(422, { message: 'bad' }) }))
    ).toBe('origin_ok');
    expect(
      classifyNetworkError(axiosError({ response: fromGateway(502) }))
    ).toBe('gateway_failure');
  });

  it('returns null for values that are not axios errors', () => {
    expect(classifyNetworkError(new Error('service bug'))).toBeNull();
    expect(classifyNetworkError('a string')).toBeNull();
    expect(classifyNetworkError(null)).toBeNull();
  });

  it('ignores the timeout of a long-running request', () => {
    const error = axiosError({ code: 'ECONNABORTED', config: { longRunning: true } });

    // A slow report must never be able to flag the whole app as down.
    expect(classifyNetworkError(error)).toBeNull();
    expect(classifyNetworkError(error, { longRunning: true })).toBeNull();
  });

  it('still counts other failures on a long-running request', () => {
    const error = axiosError({
      code: 'ERR_NETWORK',
      config: { longRunning: true },
    });
    expect(classifyNetworkError(error)).toBe('no_response');
  });

  it('lets an explicit option override the config flag', () => {
    const error = axiosError({ code: 'ECONNABORTED', config: { longRunning: true } });
    expect(classifyNetworkError(error, { longRunning: false })).toBe('timeout');
  });

  it('exposes the cancellation and timeout predicates', () => {
    expect(isCanceledRequest(axiosError({ code: 'ERR_CANCELED' }))).toBe(true);
    expect(isTimeoutError(axiosError({ code: 'ECONNABORTED' }))).toBe(true);
    expect(isCanceledRequest(new Error('x'))).toBe(false);
    expect(isTimeoutError(new Error('x'))).toBe(false);
  });
});

describe('network-error: suspicion', () => {
  it('treats transport, timeout and gateway failures as suspect', () => {
    for (const evidence of ['no_response', 'timeout', 'gateway_failure'] as const) {
      expect(isSuspectEvidence(evidence, 'app')).toBe(true);
    }
  });

  it('does not suspect an app request from a foreign response', () => {
    // A proxy 404 or captive portal page on one business route is background
    // noise, not an outage.
    expect(isSuspectEvidence('foreign', 'app')).toBe(false);
  });

  it('fails a probe on a foreign response', () => {
    // The probe exists precisely to ask whether Laravel answered, so anything
    // else is a failed check.
    expect(isSuspectEvidence('foreign', 'probe')).toBe(true);
  });

  it('never suspects from cancellation, origin or nothing', () => {
    expect(isSuspectEvidence('canceled', 'app')).toBe(false);
    expect(isSuspectEvidence('origin_ok', 'app')).toBe(false);
    expect(isSuspectEvidence(null, 'app')).toBe(false);
    expect(isSuspectEvidence(null, 'probe')).toBe(false);
  });
});

describe('network-error: reasons', () => {
  it('identifies maintenance from an unmarked 503', () => {
    // Laravel serves maintenance before the HTTP kernel runs, so it can never
    // carry the marker. An unmarked 503 is therefore positively maintenance
    // rather than guessed at.
    expect(reasonFromEvidence('gateway_failure', 503)).toBe('maintenance');
  });

  it('maps other gateway failures to gateway', () => {
    expect(reasonFromEvidence('gateway_failure', 502)).toBe('gateway');
    expect(reasonFromEvidence('foreign', 200)).toBe('gateway');
  });

  it('maps transport evidence to its own reasons', () => {
    expect(reasonFromEvidence('no_response')).toBe('no_response');
    expect(reasonFromEvidence('timeout')).toBe('timeout');
  });

  it('falls back to gateway for anything else', () => {
    expect(reasonFromEvidence(null)).toBe('gateway');
    expect(reasonFromEvidence('canceled')).toBe('gateway');
  });
});

describe('network-error: user-facing copy', () => {
  it('prefers the server message when there is one', () => {
    const error = axiosError({ response: fromLaravel(422, { message: 'Name is required.' }) });
    expect(describeNetworkError(error)).toBe('Name is required.');
  });

  it('names maintenance specifically', () => {
    const error = axiosError({ response: fromGateway(503) });
    expect(describeNetworkError(error)).toContain('temporarily unavailable');
  });

  it('distinguishes a timeout from a dead connection', () => {
    expect(describeNetworkError(axiosError({ code: 'ECONNABORTED' }))).toContain('too long');
    expect(describeNetworkError(axiosError({ code: 'ERR_NETWORK' }))).toContain(
      'Could not reach the server'
    );
  });

  it('falls back to generic copy for a non-axios throw', () => {
    expect(describeNetworkError(new Error('boom'))).toBe(
      'Something went wrong. Please try again.'
    );
  });
});