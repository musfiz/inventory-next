# Loading State Standardization Plan

## Purpose

Standardize loading behavior across `inventory-ui` using Next.js 16 conventions, consistent UI primitives, and a single global request indicator.

This document covers loading states only. It does not change authentication, data-fetching strategy, or business logic.

## Executive Summary

The application already uses some correct Next.js loading patterns, especially the route-level `loading.tsx` files and storefront skeletons. However, loading behavior is currently fragmented across 14 patterns:

- Multiple spinner implementations with different sizes, colors, and border styles
- A protected-layout progress bar driven by a 500ms timer rather than actual navigation or request state
- Only four `loading.tsx` files, leaving most admin route segments without route-specific fallbacks
- Inconsistent `Suspense` fallback markup and loading text
- More than 50 forms with duplicated button-loading markup
- No shared spinner, page-loader, skeleton, or global progress-bar component
- Missing accessibility attributes such as `role="status"`, `aria-label`, and `aria-busy`
- Skeleton and shimmer patterns concentrated in the storefront, with admin pages mostly using spinners

The recommended target is a layered loading system:

1. Next.js `loading.tsx` for route-segment transitions
2. A global, non-blocking top progress bar for navigation and API activity
3. Shared `Spinner` and `PageLoader` primitives for consistent full-page and inline states
4. Skeletons for content-shaped loading, especially tables and storefront grids
5. Button-level loading states for mutation actions
6. Blocking progress modals only for long-running operations with meaningful progress

## Current Audit

### Loading Pattern Inventory

| # | Pattern | Current location | Assessment |
|---|---|---|---|
| 1 | Global loading fallback | `app/loading.tsx` | Correct convention, but spinner is isolated and not reusable |
| 2 | Route progress bar | `app/(protected)/layout.tsx` | Replace; timer-based and not tied to real transition state |
| 3 | Pulse skeletons | Storefront `loading.tsx` files | Good pattern; standardize primitive and accessibility |
| 4 | Shimmer skeletons | `ProductCardSkeleton`, `HeroCarousel` | Good pattern; currently storefront-specific |
| 5 | Button spinner and text | 50+ form buttons | Keep behavior; standardize spinner markup gradually |
| 6 | Icon swap spinner | Ecommerce and form pages | Keep behavior; consolidate visual implementation |
| 7 | Refresh icon spinner | `DataTable` and pages | Correct for refresh actions; add shared accessibility label |
| 8 | DataTable row spinner | `components/ui/datatable.tsx` | Improve with table skeleton rows where practical |
| 9 | Custom SVG spinner | POS dropdowns | Replace with shared spinner |
| 10 | SweetAlert2 loading modal | `lib/notifications.ts` | Keep for blocking long operations |
| 11 | Progress modal | `BackupProgressModal.tsx` | Keep; this is the current quality reference |
| 12 | Suspense fallbacks | Nine files | Standardize fallback components and text |
| 13 | Account layout skeleton | Storefront account layout | Keep and align with shared skeleton tokens |
| 14 | Redirect spinner | Ecommerce root page | Replace with shared page-loader or route fallback |

### Specific Inconsistencies

- Spinner styles include `border-4 border-indigo-600`, `border-b-2 border-indigo-600`, `border-2 border-blue-500`, `Loader2`, and custom SVGs.
- Loading text varies between `Loading...`, `Loading…`, `Saving...`, `Creating...`, and `Updating...`.
- `animate-spin`, `animate-pulse`, and the custom `.sf-shimmer` animation use different visual conventions.
- Some dark-mode variants are missing.
- Most loading states do not expose a semantic status to assistive technology.
- The protected-layout progress bar is decorative: it starts on pathname changes and finishes after a fixed timeout, regardless of whether the transition or data request has completed.

## Target Architecture

### Layer 1: Next.js Route Loading

Use the Next.js file convention wherever a route segment has a meaningful loading experience:

- Keep `app/loading.tsx` as the global fallback.
- Add route-specific `loading.tsx` files under major `(protected)` segments.
- Prefer content-shaped skeletons for pages with predictable layouts.
- Use a compact `PageLoader` for routes where a skeleton would add unnecessary complexity.
- Keep storefront skeletons because they already match the content layout well.

Recommended initial admin segments:

- `app/(protected)/loading.tsx`
- `app/(protected)/products/loading.tsx`
- `app/(protected)/sales-orders/loading.tsx`
- `app/(protected)/pos-sales/loading.tsx`
- `app/(protected)/purchase-orders/loading.tsx`

### Layer 2: Global Top Progress Bar

Add one top progress bar in the root layout so it works across admin, storefront, and authentication routes.

The bar should:

- Be non-blocking and approximately 2–3px high
- Start when an API request begins or a client-side route transition begins
- Trickle toward approximately 90% while work is active
- Complete to 100% when all tracked work settles, then fade out
- Never prevent clicking or keyboard interaction
- Be mounted once in `app/layout.tsx`
- Respect dark mode and use a project color token
- Expose an accessible status through a visually hidden live region if needed

A small custom implementation is preferable to adding `nprogress` or another dependency. The project already has Zustand and Axios, so a request counter can be shared without introducing another package.

### Layer 3: Shared Loading Primitives

Create reusable components in `components/ui/`:

#### `Spinner`

A single spinner with consistent sizes:

- `xs`: compact button and inline actions
- `sm`: table rows and controls
- `md`: section-level loading
- `lg`: full-page loading

It should provide:

- Consistent animation and color tokens
- `role="status"`
- An accessible label such as `Loading`
- Dark-mode styling
- Stable dimensions so layout does not shift

#### `PageLoader`

A full-page or available-space loader built on `Spinner`:

- Centered content
- Consistent minimum height
- Optional label
- `aria-busy="true"`
- Reused by `app/loading.tsx`, auth guards, redirects, and simple Suspense fallbacks

#### `Skeleton`

A shared skeleton primitive for predictable content shapes:

- Text line
- Avatar or icon block
- Rectangle
- Card
- Table row
- Grid item

The existing storefront shimmer should remain available, but its colors and animation should be expressed through shared tokens rather than being a one-off visual system.

### Layer 4: Local Action Loading

Keep local loading state for actions that need to disable controls or communicate a specific operation:

- Form submission
- Save/update/delete operations
- Refresh buttons
- Async select options
- File upload actions

The global progress bar must not replace button-level feedback. Users still need to know which control is active and why it is disabled.

Standardize local action behavior:

- Disable the initiating control while its operation is active
- Preserve the button width when text changes
- Use the shared `Spinner size="xs"`
- Keep specific text such as `Saving...` or `Deleting...` when it improves clarity
- Add `aria-disabled` where appropriate
- Avoid rendering multiple competing loading indicators for one action

### Layer 5: Blocking and Long-Running Operations

Keep blocking UI only when the user must wait for an operation to finish before continuing:

- Backup and restore
- Long imports and exports
- Operations with server-reported progress

`BackupProgressModal.tsx` is the current reference implementation because it shows real progress, terminal states, status colors, and a clear close action.

Do not use the blocking SweetAlert2 loading modal for ordinary page navigation, routine API requests, or short form submissions.

## Global Request Tracking Design

Add a small Zustand store such as `stores/loading-store.ts`:

- `activeRequests: number`
- `isLoading: boolean`
- `start()` increments the request count
- `stop()` decrements the count and clamps it at zero

Wire the store into `lib/api/axios.ts`:

- Start tracking when an Axios request begins.
- Stop tracking on both successful and failed responses.
- Preserve correct counting when the existing CSRF-cookie request and 419 retry flow runs.
- Ensure every started request has exactly one matching stop call.
- Do not treat a failed request as an application error by itself; existing error handling remains responsible for that.

The request counter should drive the top progress bar only. Individual pages should continue to own their local button, table, and content states.

## Implementation Checklist

### Phase 1: Core primitives

- [ ] Create `stores/loading-store.ts` with a request counter.
- [ ] Create `components/ui/spinner.tsx` with `xs`, `sm`, `md`, and `lg` sizes.
- [ ] Create `components/ui/page-loader.tsx` using the shared spinner.
- [ ] Define loading color, animation, and spacing tokens consistent with the existing theme.
- [ ] Add accessibility attributes to the new components.

### Phase 2: Global indicators

- [ ] Create `components/ui/top-progress-bar.tsx` as a client component.
- [ ] Drive it from the request counter.
- [ ] Handle route changes with `usePathname()`.
- [ ] Trickle while work is active and complete/fade when work settles.
- [ ] Mount it once in `app/layout.tsx`.
- [ ] Confirm it is non-blocking and does not cause layout shift.

### Phase 3: Axios integration

- [ ] Add request tracking to `lib/api/axios.ts`.
- [ ] Balance start/stop calls across success, errors, CSRF initialization, and 419 retries.
- [ ] Confirm the progress bar cannot remain active after a rejected request.
- [ ] Confirm concurrent requests keep the bar active until the last request settles.

### Phase 4: Existing fallback cleanup

- [ ] Replace the markup in `app/loading.tsx` with `PageLoader`.
- [ ] Remove the fake timer-based progress bar from `app/(protected)/layout.tsx`.
- [ ] Keep auth-guard loading behavior while `hydrated`, auth, or redirect state is unresolved.
- [ ] Reuse `PageLoader` for the protected layout's Suspense fallback.
- [ ] Standardize the raw `Loading...` and `Loading…` Suspense fallbacks.
- [ ] Replace the ecommerce redirect spinner with the shared loader.

### Phase 5: Route-level loading coverage

- [ ] Add loading fallbacks to the major protected route segments.
- [ ] Add admin table skeletons where the table structure is predictable.
- [ ] Keep storefront product and hero skeletons, aligning them with shared tokens.
- [ ] Keep `AccountLayoutSkeleton` where it accurately represents the account layout.

### Phase 6: Incremental component migration

- [ ] Replace custom border spinners with `Spinner` as files are changed.
- [ ] Replace custom SVG spinners in POS controls.
- [ ] Update refresh buttons with a shared accessible loading pattern.
- [ ] Preserve operation-specific button text.
- [ ] Avoid a risky bulk rewrite of all 50+ working forms in one change.

### Phase 7: Documentation and validation

- [ ] Update section 4.2 of `GAP_ANALYSIS_CHECKLIST.md` after implementation.
- [ ] Document when to use a page loader, skeleton, inline spinner, top progress bar, or blocking progress modal.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Test admin-to-admin navigation.
- [ ] Test storefront navigation.
- [ ] Test authentication redirects and logout loading behavior.
- [ ] Test one successful API request, one rejected request, concurrent requests, and a CSRF retry if reproducible.
- [ ] Confirm the top progress bar is not duplicated by the protected layout.
- [ ] Confirm loading text and controls do not overlap on mobile widths.

## Usage Rules

| Situation | Correct loading UI |
|---|---|
| Route segment is waiting to render | Next.js `loading.tsx` |
| Predictable content is waiting | Skeleton matching the final layout |
| Short inline API request | Inline `Spinner` or content placeholder |
| Form submit or mutation | Disabled button with `Spinner` and specific action text |
| Refresh action | Spinning refresh icon with accessible label |
| Any active API or route transition | Non-blocking global top progress bar |
| Backup, restore, import, or export with real progress | Blocking progress modal |
| Short redirect page | Shared `PageLoader` or route-level fallback |

## Non-Goals

- Do not introduce a second data-fetching library solely to manage loading states.
- Do not replace all local `isLoading` state with one global boolean.
- Do not show a blocking modal for ordinary navigation or short requests.
- Do not bulk-rewrite every form only for spinner markup consistency.
- Do not use cookie presence or authentication state as a substitute for visual loading state.

## Expected Result

After implementation, users should see:

- A consistent, non-blocking progress signal during navigation and API activity
- Content-shaped skeletons where the page structure is known
- Stable and accessible spinners for local actions
- Clear operation-specific button feedback
- No fake progress animation that completes before work is finished
- No full-page loading loop caused by competing route and auth indicators
- A clear separation between route loading, request loading, action loading, and real long-running progress
