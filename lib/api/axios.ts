import Axios, { type CreateAxiosDefaults } from 'axios';
import { useLoadingStore } from '@/stores/loading-store';
import { useNetworkStore } from '@/stores/network-store';
import {
  classifyNetworkError,
  classifyResponse,
  isSuspectEvidence,
  reasonFromEvidence,
} from './network-error';

export const isDemoModeForbidden = (error: any): boolean =>
  error?.response?.status === 403 && error?.response?.data?.code === 'DEMO_MODE';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Opt this request out of connectivity evidence.
     *
     * For calls whose normal duration exceeds any sane timeout — exports, large
     * report builds. Their timeouts are not treated as evidence, so a slow
     * report can never flag the whole app as down. Other failures on the same
     * request still count.
     *
     * @example
     * axios.get('/api/v1/reports/sales', { longRunning: true, timeout: 120_000 });
     */
    longRunning?: boolean;
  }
}

/**
 * Report one observed outcome to the connectivity store.
 *
 * Every response — success or failure — is classified by *who answered*, and
 * only suspect evidence is forwarded. The store turns suspicion into an outage
 * only after a confirmation probe also fails, so a single slow endpoint cannot
 * put a banner on screen.
 */
function reportEvidence(response: unknown): void {
  const evidence = classifyResponse(response as never);

  if (evidence === 'origin_ok') {
    // Laravel answered. The cheapest possible liveness signal, and it clears a
    // stale outage left over from a blip — cheaper and more accurate than a
    // heartbeat.
    useNetworkStore.getState().dispatch({ type: 'origin_ok' });
    return;
  }

  if (isSuspectEvidence(evidence, 'app')) {
    useNetworkStore.getState().dispatch({
      type: 'suspect',
      reason: reasonFromEvidence(evidence, (response as { status?: number })?.status),
    });
  }

  // `foreign` is deliberately ignored here: something answered, and it was not
  // Laravel, but a proxy 404 or captive portal page on one business route is
  // background noise, not an outage. The probe is what adjudicates that.
}

/** Defaults shared by every API client instance this module creates. */
const SHARED_DEFAULTS = {
  // Calls are same-origin; next.config.mjs rewrites /api and /sanctum to the backend.
  // This keeps the session cookie first-party so proxy.ts can read it for auth.
  baseURL: '',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
};

// Track global request activity for the top progress bar (client only).
const trackStart = () => {
  if (typeof window !== 'undefined') useLoadingStore.getState().start();
};
const trackStop = () => {
  if (typeof window !== 'undefined') useLoadingStore.getState().stop();
};

// Flag to track if CSRF cookie has been fetched
let csrfCookieFetched = false;

/**
 * Build an API client with the shared interceptors attached.
 *
 * `overrides` is where the instances differ from each other — currently only
 * `longRunning`. Everything that must behave identically (CSRF prefetch, 419
 * retry, 403 handling, evidence reporting) is applied here, once, so a second
 * instance can never drift out of step with the first.
 */
function createApiClient(overrides: CreateAxiosDefaults = {}) {
  const instance = Axios.create({ ...SHARED_DEFAULTS, ...overrides });

  // Request interceptor to fetch CSRF cookie before POST requests
  instance.interceptors.request.use(
    async config => {
      trackStart();

      // Only fetch CSRF cookie for POST, PUT, PATCH, DELETE requests
      const methodsRequiringCsrf = ['post', 'put', 'patch', 'delete'];
      const method = config.method?.toLowerCase();

      if (method && methodsRequiringCsrf.includes(method) && !csrfCookieFetched) {
        try {
          // Fetch CSRF cookie
          await Axios.get(`/sanctum/csrf-cookie`, {
            withCredentials: true,
          });
          csrfCookieFetched = true;
        } catch (error) {
          console.error('Failed to fetch CSRF cookie:', error);
        }
      }

      return config;
    },
    error => {
      // Balance a start() that already happened for this request.
      trackStop();
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle 419 CSRF token mismatch and 403 permission errors
  instance.interceptors.response.use(
    response => {
      trackStop();
      reportEvidence(response);
      return response;
    },
    async error => {
      // Stop tracking for the failed request. The 419 retry below re-enters the
      // request interceptor and calls trackStart() again, so counting stays balanced.
      trackStop();

      // Classify the failure the same way as a success, because the question is
      // the same: who answered? A marked 4xx or 5xx means Laravel answered — a
      // server problem to report, not a connectivity problem. An unmarked
      // gateway response or a transport failure is suspect, and `longRunning`
      // keeps a slow report's timeout out of the evidence.
      const evidence = classifyNetworkError(error, {
        longRunning: error?.config?.longRunning === true,
      });

      if (evidence === 'origin_ok') {
        reportEvidence(error.response);
      } else if (isSuspectEvidence(evidence, 'app')) {
        useNetworkStore.getState().dispatch({
          type: 'suspect',
          reason: reasonFromEvidence(evidence, error?.response?.status),
        });
      }
      // `canceled` and non-axios throws are ignored entirely: route changes and
      // unmounts abort in flight constantly, and a bug in a service says nothing
      // about connectivity.

      const originalRequest = error.config;

      // If we get a 419 error (CSRF token mismatch), refetch the cookie and retry
      if (error.response?.status === 419 && !originalRequest._retry) {
        originalRequest._retry = true;
        csrfCookieFetched = false;

        try {
          // Refetch CSRF cookie
          await Axios.get(`/sanctum/csrf-cookie`, {
            withCredentials: true,
          });
          csrfCookieFetched = true;

          // Retry the original request
          return instance(originalRequest);
        } catch (csrfError) {
          console.error('Failed to refresh CSRF cookie:', csrfError);
        }
      }

      // Handle 403 permission errors
      if (error.response?.status === 403) {
        // Demo mode blocked action: do NOT redirect — the caller's error
        // handler already surfaces the message (swal). Just reject.
        if (isDemoModeForbidden(error)) {
          return Promise.reject(error);
        }
        // Redirect to access denied page if permission denied
        if (typeof window !== 'undefined') {
          window.location.href = '/access-denied';
        }
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

const axios = createApiClient();

/**
 * Client for calls that are legitimately slow: report builds, exports, full
 * database backups and restores.
 *
 * These opt out of connectivity evidence by default, so their timeouts can never
 * flag the whole app as down. Other failures on the same requests — a refused
 * connection, a proxy 502 — still count, because those say something real.
 *
 * With the confirmation probe in place this is belt-and-braces rather than the
 * only defence: a false outage would otherwise cost one probe per report, which
 * on a page that loads six of them adds up.
 */
export const longRunningApiClient = createApiClient({ longRunning: true });

export default axios;
