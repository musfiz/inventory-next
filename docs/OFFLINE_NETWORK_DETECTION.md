# Offline / Network Error Detection

Connectivity handling for the Next.js app: a `useOffline` hook, the state behind
it, and the axios wiring that turns a failed request into a verified network
signal.

---

## The question this answers

**Did Laravel answer?**

Not "did the server answer". The browser never talks to Laravel directly — it
talks to the Next.js server, which proxies `/api/*` and `/sanctum/*` to the
backend through rewrites in [next.config.mjs](../next.config.mjs). So when
Laravel is down, the browser still receives an HTTP response: a proxy 5xx, or a
`503` from Laravel in maintenance mode. Any rule of the form "an HTTP status
means reachable" reports a dead backend as healthy.

The only trustworthy signal is a response carrying the **origin marker** that
Laravel stamps on every API response (`App\Constants\ApiOrigin` →
`X-Api-Origin: laravel`). Anything else that answers is, from this app's point
of view, a stranger.

| Situation | `navigator.onLine` | Response seen by browser | V2 verdict |
| --- | --- | --- | --- |
| Airplane mode, Wi-Fi off | `false` | none | `no_response` → offline |
| Laravel process dead | **`true`** | proxy 5xx | `gateway_failure` |
| `php artisan down` | **`true`** | unmarked `503` | `maintenance` |
| Captive portal | **`true`** | `200 text/html` | `foreign` |
| Laravel 500 (bug in app) | **`true`** | `500` + **marker** | `origin_ok` — healthy |

The last row is the point: a Laravel 500 is a *bug to report*, not an outage to
announce, and the marker is what keeps the two apart.

---

## Architecture

```
                    ┌──────────────────────────────┐
 window online/offline ▶                            │
 document visibility ───▶│  stores/network-store      │◀── useOffline()
                    │   one reducer, one truth     │      hooks/use-offline.ts
 axios interceptor ─▶│                            │            │
   reportEvidence()  │  status + reason +          │            ▼
                    │  reachability (3-valued)     │   components/layout/offline-banner.tsx
   health probe ────▶└────────────▲───────────────┘
   (V2 confirms)                    │
                    lib/api/network-monitor.ts
                    lib/api/network-error.ts  (pure classifier)
```

### Files

| File | Role |
| --- | --- |
| `lib/api/network-error.ts` | Pure classification into evidence kinds. No React, no store. |
| `stores/network-store.ts` | One reducer, three-valued reachability, `reason`. |
| `lib/api/network-monitor.ts` | Engine: browser events, visibility, confirmation probe, jittered backoff. |
| `hooks/use-offline.ts` | The public hook. |
| `components/layout/network-monitor.tsx` | Mounts the engine; staggered SWR revalidation on recovery. |
| `components/layout/offline-banner.tsx` | The user-visible notice, three copy variants. |
| `lib/api/axios.ts` | Reports evidence from every response (modified). |

Backend counterparts: `App\Constants\ApiOrigin`, `App\Http\Middleware\AddApiOriginMarker`,
`App\Http\Controllers\Api\HealthController`.

---

## Verify, then announce

**One failed request is a suspicion, not an outage.** It could be a slow report,
a flaky response, a captive portal. So suspect evidence does *not* move the
status. It arms a confirmation probe, and only a probe that **also** fails
promotes the app to `unreachable`.

This is the single most important behaviour here, and it is why a single slow
endpoint cannot take the dashboard offline.

The reducer models this with two distinct events:

```ts
| { type: 'suspect';   reason }  // arms a probe; changes nothing visible
| { type: 'confirmed'; reason }  // probe also failed → announce
```

`suspected` is transient and never exposed to the UI.

### The probe

- Requires **`200` *and* the marker**. A Laravel 500 carries the marker but means
  the app is broken, not absent, and must not read as recovery.
- Targets an unauthenticated `/api/v1/health`, not a business endpoint — so no
  credentials (every probe would be a logged 401) and no database access (a
  database blip must not read as an outage).
- Uses base `Axios`, not the app instance: it must not touch the loading counter,
  trigger a CSRF fetch, or re-enter the interceptor that informs it.
- Backoff `1s → 5s → 15s → 30s → 60s`, **with full jitter**. Without jitter every
  tab open during an outage retries in lockstep, which is how a recovering
  backend gets knocked over by its own clients.
- **Pauses while the tab is hidden**, probes once on return. A hidden tab asking
  "is the API up?" serves nobody — the user cannot see the answer until they
  return, which is exactly when they want it.
- **Zero requests while healthy.** This is not a heartbeat. An outage is already
  visible in the response path; probing on a timer would double backend load to
  learn something already known.

---

## State model

### Public surface

```ts
const {
  isOffline,      // status !== 'online' — informational only
  isOnline,       // browser reports a link
  isReachable,    // a marked response was seen
  status,         // 'online' | 'offline' | 'unreachable'
  reachability,   // 'reachable' | 'unreachable' | 'unknown'
  reason,         // 'no_link' | 'no_response' | 'timeout' | 'gateway' | 'maintenance'
  changedAt,      // epoch ms of the last real transition
  hydrated,       // false during SSR / first client render
  canBlockWrites, // true only on offline + no_link
  refresh,        // force an immediate check
} = useOffline();
```

### Reachability is three-valued

`reachable` / `unreachable` / **`unknown`**. When the link is down we genuinely
do not know about the server. Two booleans forced that unknown to be spelled
`false`, which is how the invariant "offline implies not reachable" ended up
documented but false in code. The reducer resolves it structurally:

- `isReachable === (reachability === 'reachable')`, so it is always false while
  the link is down.
- `origin_ok` arriving while the browser insists there is no link is ignored
  entirely. Believing it is the original bug: it set reachability from a
  response while `isOnline` was false.
- `browser_offline` **preserves** an existing `unreachable`. Wi-Fi blips cannot
  erase *confirmed* knowledge from a real failed probe. `reachable` does lapse,
  because a link that just died says nothing about the server any more.
- `browser_online` leaves reachability untouched. Turning the link on proves the
  link works, not that Laravel came back.

### One writer

Every transition is one event through one pure reducer. The invariants live in
one place instead of being re-derived in five mutators. The reducer returns
`null` when an event changes nothing, which keeps duplicates free and — critically
— keeps `changedAt` from moving when the status did not change. `changedAt`
identifies an outage for banner dismissal, so re-stamping it mid-outage would
silently un-dismiss a banner the user had closed.

### Hydration safety

The store starts at `online` / `reachability: 'unknown'` / `hydrated: false`, so
the server render and the first client render agree. Components gate on
`hydrated` before rendering any offline state.

---

## Using it in the UI

```tsx
'use client';
import { useOffline } from '@/hooks/use-offline';

export default function SaveButton() {
  const { canBlockWrites, reason } = useOffline();
  const [saving, setSaving] = useState(false);

  return (
    <button disabled={canBlockWrites || saving}>
      {reason === 'maintenance' ? 'Down for maintenance' : 'Save'}
    </button>
  );
}
```

### Rules for consumers

- **Do not block writes on `unreachable`.** It may be a false alarm, and a
  blocked write fails fast anyway. `canBlockWrites` is the honest gate: true only
  when the browser itself says nothing can be sent.
- **On a failed mutation, show the real failure.** Use
  `describeNetworkError(error)` — it prefers Laravel's own `message`, so
  validation errors are never flattened. The banner is informational, not a
  substitute for an error message.
- **Gate on `hydrated`** before showing offline state.

### Banner copy

Three variants, because "no network" and "down for maintenance" call for
different user behaviour — the first is worth retrying elsewhere, the second is
worth waiting out.

| `reason` | Title |
| --- | --- |
| `no_link` | You're offline |
| `maintenance` | Temporarily unavailable |
| `gateway` / `no_response` / `timeout` | Can't reach the server |

Dismissal is scoped to the outage identified by `changedAt`, which now only moves
on real transitions, so repeated failures cannot reset it. To relocate the
banner, change the wrapper classes in `components/layout/offline-banner.tsx` — the
state logic is independent of placement.

---

## Backend contract

Two pieces, both required for detection to work.

**Origin marker.** `AddApiOriginMarker` is prepended to the API middleware group
so it wraps everything. It must be outermost because several middleware below
return early *without* calling `$next()` — auth rejections, demo-mode blocks — and
a denial that reached the client unmarked would be misread as foreign. An
exception propagating out of the stack never returns to `handle()` at all, so the
`respond` hook in [bootstrap/app.php](../inventory-api/bootstrap/app.php) covers
unhandled 500s and unmatched routes.

**Health route.** `/api/v1/health`, unauthenticated, constant body, `no-store`,
its own generous limiter (`health-probe`, 120/min). It must sit under `/api/` or
next.config.mjs will not proxy it and it will hit Next.js, which answers 404
with no marker — indistinguishable from a dead backend.

---

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_NETWORK_PROBE_URL` | `/api/v1/health` | Probe endpoint |
| `NEXT_PUBLIC_NETWORK_PROBE_TIMEOUT_MS` | `5000` | Probe timeout |
| `NEXT_PUBLIC_NETWORK_RECOVERY_PROBE` | `true` | Set `false` to disable background re-checking |

Read as **static** `process.env.NEXT_PUBLIC_*` accesses — Next.js inlines those
at build time by literal match, so a computed `process.env[key]` lookup yields
`undefined` in the browser bundle. Changing them requires a rebuild.

**Kill switch.** If a proxy in some environment strips the marker, set
`NEXT_PUBLIC_NETWORK_RECOVERY_PROBE=false`. Detection still works; only the
automatic recovery probe is removed, leaving recovery dependent on user-initiated
requests. This is the failure mode worth verifying in each environment.

---

## Tests

```bash
# Frontend — 286 tests
npx vitest run lib/api/network-error.test.ts stores/network-store.test.ts \
                hooks/use-offline.test.ts components/layout/offline-banner.test.tsx \
                lib/api/network-monitor.test.ts

# Backend
php artisan test --filter=ApiOriginMarkerTest
```

Coverage: the classifier matrix (marker / gateway / foreign / timeout /
canceled / non-axios), reducer invariants including generated event sequences,
`changedAt` behaviour, confirmation gating, backoff bounds with jitter, visibility
pausing, zero-requests-while-healthy, banner copy variants and dismissal scoping.

The banner tests pin `Date.now()`, because `changedAt` is stamped from it and two
outages inside the same millisecond would look like one.

### Note on the backend suite

The Laravel test suite requires `pdo_sqlite`, which is not enabled in the local
`php.ini` on this machine. Run:

```bash
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/pest
```

Tests using `RefreshDatabase` still fail on sqlite because the schema's fulltext
indexes cannot be created by that driver. `ApiOriginMarkerTest` deliberately needs
no database, so it passes.

---

## Known limitations

- **Detection and messaging only.** Failed writes are not queued or replayed. A
  mutation that fails while offline is lost; the UI says so rather than retrying.
- **A proxy fault and a backend outage look the same.** Both surface as `gateway`;
  telling them apart would mean trusting infrastructure that may not be there.
- **A very slow but working backend reads as healthy** until requests actually
  fail. Confirmation bounds the damage to one extra probe, but cannot predict
  slowness.
- **Cross-tab sharing is not implemented.** Each tab probes independently, so N
  open tabs mean N probes during an outage. Jitter keeps this from synchronising,
  and the health route's limiter absorbs it, but it is N× the traffic.
- **A CDN or WAF returning non-JSON 5xx for ordinary Laravel errors** would read as
  a gateway failure. The confirmation probe limits the impact, since the health
  route would still pass.