/**
 * Evidence classification for connectivity detection.
 *
 * ## The question this module answers
 *
 * *Did Laravel answer?*
 *
 * Not "did the server answer". The browser never talks to Laravel directly: it
 * talks to the Next.js server, which proxies `/api/*` and `/sanctum/*` to the
 * backend through rewrites in next.config.mjs. So when Laravel is down the
 * browser still receives an HTTP response — a proxy 5xx, or a 503 from Laravel
 * in maintenance mode. Any rule of the form "an HTTP status means reachable"
 * reports the backend as healthy while it is dead.
 *
 * The only trustworthy signal is a response carrying the origin marker that
 * Laravel stamps on every API response (`App\Constants\ApiOrigin`). Anything
 * else that answers is, from this app's point of view, a stranger.
 *
 * ## Pure by design
 *
 * No React, no store, no browser globals — only value inspection. That makes
 * the rules trivially testable and safe to import from anywhere, including the
 * axios interceptor and the connectivity engine.
 */

/** Response header Laravel stamps on every API response. */
export const ORIGIN_HEADER = 'X-Api-Origin';

/** The constant value of that header. Never varies per environment. */
export const ORIGIN_VALUE = 'laravel';

/**
 * What one completed request or probe proved.
 *
 * Every outcome lands in exactly one of these. They exist because the useful
 * distinctions are not "error vs success" but "who answered, and how".
 */
export type NetworkEvidence =
  /** A response carrying the origin marker — Laravel answered. Any status. */
  | 'origin_ok'
  /** 502/503/504, or a 5xx whose body is not JSON, and no marker. */
  | 'gateway_failure'
  /** Transport failure: no HTTP response at all (DNS, TLS, reset, CORS). */
  | 'no_response'
  /** The client gave up waiting. */
  | 'timeout'
  /** Aborted by the caller. Says nothing about connectivity. */
  | 'canceled'
  /**
   * A response with no marker that is not a gateway failure — a captive portal
   * answering `200 text/html`, or a Next.js route answering 404. Something
   * answered, and it was not Laravel.
   *
   * Neutral for app requests; a failed check for probes.
   */
  | 'foreign';

/** Why the app believes it is degraded. Drives banner copy and diagnostics. */
export type NetworkReason =
  | 'no_link'
  | 'no_response'
  | 'timeout'
  | 'gateway'
  | 'maintenance';

/** Whether the evidence came from a normal app request or a health probe. */
export type EvidenceContext = 'app' | 'probe';

/**
 * Whether the backend stamps the origin marker at all.
 *
 * `unknown` until a response settles it. This exists for rollout safety: the
 * marker ships in the backend, and a frontend deployed against a backend that
 * does not have it yet would see *every* response as foreign. Rather than
 * making deploy order a hard constraint, the client learns the answer from
 * traffic — a well-formed API response with no marker proves the deployment
 * predates the marker, and detection then falls back to status-based rules.
 */
let markerSupport: 'unknown' | 'present' | 'absent' = 'unknown';

/** Current belief about whether this backend emits the marker. */
export function getMarkerSupport(): 'unknown' | 'present' | 'absent' {
  return markerSupport;
}

/**
 * Record what a response proved about marker support.
 *
 * `looksLikeApiJson` gates the `absent` verdict deliberately: only a well-formed
 * API body is evidence about the *backend's* configuration. A captive portal
 * serves HTML from somewhere else entirely, so it must not be able to teach the
 * client that the backend lacks a header — that would let a stranger page
 * downgrade a real backend to marker-less and be read as healthy afterwards.
 */
function observeMarkerSupport(hasMarker: boolean, looksLikeApiJson: boolean): void {
  // 'present' is sticky — one marker is proof, and nothing un-stamps it.
  if (hasMarker) {
    markerSupport = 'present';
    return;
  }
  if (!looksLikeApiJson) return;
  if (markerSupport === 'unknown') markerSupport = 'absent';
}

/** Reset the learned marker support (tests, hard recovery). */
export function resetMarkerSupport(): void {
  markerSupport = 'unknown';
}

/** Per-request opt-out for long-running calls (exports, large reports). */
export interface ClassifyOptions {
  /**
   * Set on requests whose normal duration exceeds any sane timeout — exports,
   * big report exports. Their timeouts are ignored as evidence, so a slow
   * report cannot flag the whole app as down. Other failures on those requests
   * remain evidence.
   */
  longRunning?: boolean;
}

/**
 * Structural view of an axios response.
 *
 * Deliberately not `AxiosResponse`: this module must stay importable without
 * pulling in axios types, and tests construct plain objects.
 */
interface AxiosLikeResponse {
  status?: number;
  data?: unknown;
  headers?: unknown;
}

/**
 * Structural view of an axios error.
 *
 * Deliberately not `AxiosError`: `instanceof` is unreliable across duplicated
 * axios copies, and these modules import axios in more than one chunk. Reading
 * the `isAxiosError` brand it sets on itself is the supported discriminator.
 */
interface AxiosLikeError {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  config?: { longRunning?: boolean };
  response?: AxiosLikeResponse | null;
}

/** Statuses that mean "the thing in front of Laravel failed". */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

/** Narrows an unknown thrown value to something axios produced. */
function asAxiosLike(error: unknown): AxiosLikeError | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as AxiosLikeError;
  return candidate.isAxiosError === true ? candidate : null;
}

/**
 * Read one header from anything header-shaped.
 *
 * axios v1 exposes `AxiosHeaders` (a `.get()` method), while test fixtures and
 * some adapters hand back a plain object. Both are supported, in both the
 * exact and lowercase spellings, because HTTP header names are
 * case-insensitive and the marker's spelling must not decide the outcome.
 */
function readHeader(headers: unknown, name: string): string | null {
  if (typeof headers !== 'object' || headers === null) return null;

  const bag = headers as Record<string, unknown> & { get?: unknown };

  for (const key of [name, name.toLowerCase()]) {
    const value = bag[key];
    if (typeof value === 'string') return value;
  }

  if (typeof bag.get === 'function') {
    try {
      const value = (bag.get as (key: string) => unknown)(name);
      if (typeof value === 'string') return value;
    } catch {
      // A throwing header accessor is not worth failing detection over.
    }
  }

  return null;
}

/**
 * True when a response provably came from Laravel.
 *
 * This single check is what separates a live backend from a proxy error, a
 * gateway, or a captive portal. It is a discriminator, not a security control:
 * nothing should be authorised on it.
 */
export function hasOriginMarker(headers: unknown): boolean {
  return readHeader(headers, ORIGIN_HEADER) === ORIGIN_VALUE;
}

/** True when the caller aborted the request on purpose. */
export function isCanceledRequest(error: unknown): boolean {
  const axiosError = asAxiosLike(error);
  if (!axiosError) return false;
  // axios >= 1.x reports both CanceledError and AbortController aborts as this.
  return axiosError.code === 'ERR_CANCELED';
}

/** True when the client gave up waiting for a response. */
export function isTimeoutError(error: unknown): boolean {
  const axiosError = asAxiosLike(error);
  if (!axiosError) return false;
  return axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT';
}

/**
 * Heuristic for "this body looks like it came from an application that speaks
 * JSON API", used to tell an application's own 500 apart from a proxy's.
 *
 * A Laravel 500 is JSON; a Next.js or nginx 500 is an HTML error page.
 */
function looksLikeJson(data: unknown): boolean {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
  }
  return typeof data === 'object' && data !== null;
}

/**
 * Classify a response that arrived.
 *
 * Order is the whole logic:
 *
 * 1. The marker beats everything. A Laravel 500 is still Laravel answering —
 *    a server bug to report, not an outage to announce.
 * 2. 502/503/504 without the marker is the gateway failing.
 * 3. Any other non-JSON 5xx without the marker is also the gateway: an HTML
 *    error page did not come from this application.
 * 4. Everything else unmarked is `foreign` — something answered, not Laravel.
 */
export function classifyResponse(response: AxiosLikeResponse | null | undefined): NetworkEvidence {
  if (!response) return 'no_response';

  if (hasOriginMarker(response.headers)) {
    observeMarkerSupport(true, true);
    return 'origin_ok';
  }

  const isJson = looksLikeJson(response.data);

  // Read the belief *before* updating it: the response that teaches the client a
  // backend is marker-less must not itself be judged by that conclusion. One
  // unauthenticated JSON body is not enough to reclassify it as healthy — and it
  // costs nothing, since `foreign` is neutral for app requests.
  const wasAbsent = markerSupport === 'absent';
  observeMarkerSupport(false, isJson);

  // Once this deployment is known to predate the marker, fall back to
  // status-based rules instead of reading every response as foreign — otherwise a
  // healthy un-upgraded backend looks like a permanent outage.
  if (wasAbsent && isJson) {
    return typeof response.status === 'number' && response.status >= 500
      ? 'gateway_failure'
      : 'origin_ok';
  }

  const status = typeof response.status === 'number' ? response.status : 0;

  if (GATEWAY_STATUSES.has(status)) return 'gateway_failure';
  if (status >= 500 && !isJson) return 'gateway_failure';

  return 'foreign';
}

/**
 * Classify a thrown value.
 *
 * Returns `null` when the value is not an axios failure at all — a bug in a
 * service, a thrown string. That says nothing about connectivity, so the
 * caller ignores it.
 */
export function classifyNetworkError(
  error: unknown,
  options: ClassifyOptions = {}
): NetworkEvidence | null {
  const axiosError = asAxiosLike(error);
  if (!axiosError) return null;

  if (isCanceledRequest(error)) return 'canceled';

  if (axiosError.response) return classifyResponse(axiosError.response);

  if (isTimeoutError(error)) {
    // A long-running call timing out is the expected case, not an outage.
    if (options.longRunning ?? axiosError.config?.longRunning) return null;
    return 'timeout';
  }

  return 'no_response';
}

/** True when the caller asked for this request's timeouts to be ignored. */
export function isLongRunning(error: unknown): boolean {
  const axiosError = asAxiosLike(error);
  return axiosError?.config?.longRunning === true;
}

/**
 * Does this evidence justify *suspecting* the backend is down?
 *
 * Only suspicion. Nothing here may move the status to `unreachable` on its own
 * — that requires a confirmation probe to fail as well. A single slow endpoint
 * or a flaky response is not an outage.
 *
 * `foreign` splits by context on purpose: a captive portal serving an HTML page
 * for an app request is background noise, but the *probe* exists precisely to
 * ask whether Laravel answered, so a foreign answer fails the check.
 */
export function isSuspectEvidence(
  evidence: NetworkEvidence | null,
  context: EvidenceContext = 'app'
): boolean {
  switch (evidence) {
    case 'gateway_failure':
    case 'no_response':
    case 'timeout':
      return true;
    case 'foreign':
      return context === 'probe';
    default:
      return false;
  }
}

/**
 * Map evidence to the reason shown to the user.
 *
 * `foreign` folds into `gateway`: both mean "the thing in front of Laravel
 * answered instead of Laravel". This cannot be told apart any further without
 * trusting infrastructure that is not guaranteed to be there.
 */
export function reasonFromEvidence(
  evidence: NetworkEvidence | null,
  status?: number
): NetworkReason {
  switch (evidence) {
    case 'gateway_failure':
      // Laravel's own maintenance mode is served before the HTTP kernel runs,
      // so it can never carry the marker: an unmarked 503 is maintenance.
      return status === 503 ? 'maintenance' : 'gateway';
    case 'timeout':
      return 'timeout';
    case 'no_response':
      return 'no_response';
    default:
      return 'gateway';
  }
}

/** Pull a human-usable message out of a Laravel error envelope. */
function readServerMessage(response: AxiosLikeResponse | null | undefined): string | null {
  const data = response?.data;
  if (typeof data === 'string' && data.trim() !== '') return data;
  if (typeof data === 'object' && data !== null) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return null;
}

/**
 * Turn a request failure into copy that can go straight into a toast.
 *
 * Server-provided messages win whenever they exist, because Laravel's own
 * validation and domain errors are far more useful than anything generic. This
 * is also why the offline banner is informational: on a failed mutation, show
 * the real failure, not "you appear to be offline".
 */
export function describeNetworkError(error: unknown): string {
  const axiosError = asAxiosLike(error);
  const evidence = classifyNetworkError(error);

  switch (evidence) {
    case 'origin_ok': {
      // Laravel answered, so this is an application error. Its own message is
      // almost always more useful than anything generic — a validation failure
      // in particular must not be flattened into "something went wrong".
      const serverMessage = readServerMessage(axiosError?.response);
      if (serverMessage) return serverMessage;

      const status = axiosError?.response?.status;
      return status
        ? `Server error (${status}). Please try again.`
        : 'The server returned an error. Please try again.';
    }
    case 'timeout':
      return 'The server took too long to respond. Please try again.';
    case 'no_response':
      return 'Could not reach the server. Check your connection and try again.';
    case 'gateway_failure':
      return axiosError?.response?.status === 503
        ? 'The service is temporarily unavailable. Please try again shortly.'
        : 'The server is not responding. Please try again.';
    case 'foreign':
      return 'An unexpected response was received from the network. Please try again.';
    case 'canceled':
      return 'Request cancelled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}