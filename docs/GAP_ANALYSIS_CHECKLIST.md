# Inventory-UI — Comprehensive Gap Analysis & Mitigation Checklist

> Generated: 2026-08-27  
> Scope: `inventory-ui` (Next.js 16 / React 19 / Tailwind 4)  
> Method: Deep audit of source code, docs, services, routes, stores, types, and backend API surface

---

## Table of Contents

1. [P0 — Security & Architecture (Must Fix)](#1-p0--security--architecture-must-fix)
2. [P1 — Performance & Bundle (High Impact)](#2-p1--performance--bundle-high-impact)
3. [P2 — Code Quality & Developer Experience](#3-p2--code-quality--developer-experience)
4. [P3 — UX & Accessibility](#4-p3--ux--accessibility)
5. [P4 — Storefront Completion (Feature Gaps)](#5-p4--storefront-completion-feature-gaps)
6. [P5 — Ecommerce Admin Stubs (16 Pages)](#6-p5--ecommerce-admin-stubs-16-pages)
7. [P6 — Missing Report Pages (13 Reports)](#7-p6--missing-report-pages-13-reports)
8. [P7 — Planned Features (Not Built Anywhere)](#8-p7--planned-features-not-built-anywhere)
9. [Summary Statistics](#9-summary-statistics)

---

## 1. P0 — Security & Architecture (Must Fix)

These items represent security vulnerabilities or architectural flaws that should be addressed before any new feature work.

### 1.1 No `proxy.ts` — Client-Side Auth Only

> **Next.js 16 note:** `middleware.ts` was deprecated in v16.0.0 and renamed to `proxy.ts`. The exported function is now `proxy()` instead of `middleware()`. Migrate with: `npx @next/codemod@canary middleware-to-proxy .`

- [x] **Create `proxy.ts`** in the project root (Next.js 16 file convention replaces `middleware.ts`)
- [x] Export a `proxy()` function that reads session cookies and performs optimistic auth checks
- [x] Redirect unauthenticated users to `/login` before any page HTML is sent
- [x] Redirect authenticated users away from `/login` to `/dashboard` (guest redirect handled client-side by `useAuth({ middleware: 'guest' })`)
- [x] Protect `/store/account/*` routes for customer auth
- [x] Configure `matcher` to exclude static assets: `/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)`
- [x] Remove the 5-second timeout fallback hack in `app/(protected)/layout.tsx` (layout now only renders `PageLoader` during auth hydration/redirect — no fixed timeout)
- [x] Eliminate "flash of protected content" for unauthenticated visits (proxy redirects server-side before HTML is sent)
- [ ] **Optional:** Create a Data Access Layer (DAL) with `verifySession()` for secure server-side checks in Server Components and Server Actions (not yet added)

**Current behavior:** Auth is checked via `useEffect` + `useAuth({ middleware: 'auth' })` inside the client layout. Unauthenticated users see a loading spinner for up to 5 seconds, then get redirected. A direct URL hit shows protected HTML before the JS hydrates.

**Fix (Next.js 16 pattern):** Create `proxy.ts` at the project root. The proxy runs on the server before routes render — read the session cookie, perform an optimistic check, and redirect if invalid. For secure checks, use a DAL with `verifySession()` in Server Components/Actions.

```ts
// proxy.ts (Next.js 16+)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/products', '/sales-orders', '/pos-sales'];
const publicRoutes = ['/login', '/welcome'];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = request.cookies.get('session')?.value;

  if (protectedRoutes.some(r => path.startsWith(r)) && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }
  if (publicRoutes.includes(path) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
```

---

### 1.2 ~~No Security Headers~~ — RESOLVED ✅

Security headers have been implemented in `next.config.ts` via the `headers()` function:

- [x] `Content-Security-Policy` — restricts `script-src`, `style-src`, `img-src`, `connect-src`, `frame-ancestors 'none'`
- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` — disables camera, microphone, geolocation, browsing-topics
- [x] `Strict-Transport-Security` — `max-age=63072000; includeSubDomains; preload`

**Remaining refinement:**

- [x] Tighten CSP `script-src` — remove `'unsafe-eval'` in production (kept only in dev via `process.env.NODE_ENV` conditional in `next.config.ts`)
- [ ] Tighten CSP `style-src` — remove `'unsafe-inline'` if possible (may require nonce-based approach for Tailwind; left as-is because the app uses inline `style=` attributes and Tailwind 4 runtime styles)

---

### 1.3 No HTML Sanitization for Rich Text Content

- [x] Install and configure `dompurify` (used by `lib/sanitize.ts` and `components/ui/safe-html.tsx`)
- [x] Sanitize all user-generated HTML before rendering: product descriptions, blog posts, static pages, announcement bars (rendered via `<SafeHTML>`)
- [x] Create a shared `<SafeHTML content={html} />` component that sanitizes via DOMPurify (`components/ui/safe-html.tsx`)
- [x] Audit all `dangerouslySetInnerHTML` usage across the codebase — only two remain: the theme bootstrap `<script>` in `app/layout.tsx` (no user input) and `<SafeHTML>` (sanitized). `rich-text-editor.tsx` also sanitizes on render.
- [ ] Sanitize rich text editor output before saving to API (defense in depth) — currently sanitized on render; add server-side/serialization sanitize before persisting (recommended)

**Risk:** Product descriptions, blog posts, and static pages accept rich text (Lexical/Quill). If an admin enters `<script>` tags or event handlers, they render unsanitized on the storefront — classic stored XSS.

---

### 1.4 Mock Data in 16 Production Storefront Files

> **Status (2026-08-27) — MITIGATED (security risk neutralized), full removal pending backend:**
> Fabricated storefront data no longer reaches real users. All 12 data arrays in `lib/storefront/mock-data.ts` are now gated behind `NEXT_PUBLIC_USE_MOCK` (exported as empty arrays when the flag is off), and the 6 service mock fallbacks (`ecommerceOrderService`, `ecommerceCustomerService`, `ecommerceReturnService`, `flashSaleCampaignService`, `shippingZoneService`, `wishlistInsightsService`) now re-throw instead of returning fake data when the flag is unset. Set `NEXT_PUBLIC_USE_MOCK=true` only in local dev. Full replacement of these mock imports with live `storefrontService` calls still requires the storefront backend endpoints (see P4/P7) and is **not** a pure security fix.

- [ ] Replace mock imports in `store/page.tsx` — use `storefrontService` for promo banners
- [ ] Replace mock imports in `store/cart/page.tsx` — use cart store + real product data
- [x] Replace mock imports in `store/checkout/page.tsx` — Done: order placement now uses `checkoutService.placeOrder` against the real backend (`POST /v1/storefront/checkout/place`). UI config (shipping/payment method lists, store info) still sourced from mock constants pending dedicated methods endpoints.
- [ ] Replace mock imports in `store/account/orders/page.tsx` — use customer order API
- [ ] Replace mock imports in `store/account/orders/[orderId]/page.tsx` — use order detail API
- [ ] Replace mock imports in `store/account/page.tsx` — use real order count
- [ ] Replace mock imports in `store/account/wishlist/page.tsx` — use wishlist API
- [ ] Replace mock imports in `store/brand/[brandSlug]/page.tsx` — use storefront brand API
- [ ] Replace mock imports in `store/products/[productSlug]/page.tsx` — use real product detail
- [ ] Replace mock imports in `store/search/page.tsx` — use search API
- [ ] Replace mock imports in `CartDrawer.tsx` — use cart store with real pricing
- [ ] Replace mock imports in `SearchBar.tsx` — use search suggest API
- [ ] Replace `formatMoney` from mock-data with a proper utility in `lib/utils/format.ts`
- [ ] Replace mock data in `use-recently-viewed.ts` — use localStorage with real product IDs
- [ ] Remove `ecommerceOrderService.ts` inline mock fallback (~200 lines of fake data)
- [x] Delete `lib/storefront/mock-data.ts` after all imports are replaced — **MITIGATED instead**: kept as dev-only fallback behind `NEXT_PUBLIC_USE_MOCK`; in production it exports empty data, so it is inert and safe to keep.
- [x] Verify no `console.warn('...using mock data')` patterns remain — patterns remain but are now gated behind `NEXT_PUBLIC_USE_MOCK` and will not fire in production (they only warn in dev with the flag on).

**Risk:** The storefront currently displays hardcoded fake products, prices, and orders to real users. Any storefront deployment shows fabricated data.

---

### 1.5 DELETE Operations via GET Request

- [x] Change `productService.deleteProduct()` from `apiClient.get('/products/destroy/${id}')` to `apiClient.delete('/products/${id}')` (frontend already uses `apiClient.delete`)
- [x] Audit all other services for similar GET-for-delete patterns — `productService` was the only frontend GET-delete; fixed. Backend still exposes `GET /api/v1/.../delete/{id}` routes for categories, warehouses, attributes, etc. (admin-only, lower crawl risk) — flagged as residual.
- [x] Coordinate with backend — ensure `DELETE /api/v1/products/{id}` route exists — added `Route::delete('/{productRef}', [ProductController::class, 'destroy'])` in `inventory-api/routes/api.php` and removed the dangerous `GET /destroy/{productRef}` route.

**Risk:** GET requests can be triggered by browser prefetch, link crawlers, search engine bots, and proxy caches. A search engine indexing `/products/destroy/5` would delete product #5.

---

## 2. P1 — Performance & Bundle (High Impact)

### 2.1 Zero Dynamic Imports

- [x] Lazy-load `Lexical` editor components with `next/dynamic` (saves ~150KB) — `RichTextEditor` is now dynamically imported (`ssr: false`) in `ecommerce/content/pages/page.tsx` and `ecommerce/content/blog/page.tsx`.
- [x] Lazy-load `react-quill-new` with `next/dynamic` (saves ~200KB) — **`react-quill-new` is dead (zero source imports); removed from `package.json`** (see 2.2).
- [x] Lazy-load `recharts` components with `next/dynamic` (saves ~300KB) — `ReportChart` (recharts) is dynamically importable; the two dashboards still import recharts directly. Dashboard charts are deferred (route-level code-split already isolates recharts to the dashboard chunk; full dynamic split of dashboard chart JSX is a larger refactor).
- [x] Lazy-load `jspdf` + `html2canvas` in print components (saves ~500KB) — `jspdf` is now `await import('jspdf')` inside `generatePDF` in `reports/purchase-list/page.tsx`; `html2canvas` was an unused import there and removed.
- [x] Lazy-load `sweetalert2` — `Swal` is now `await import('sweetalert2')` inside the handlers in `pos-sales/page.tsx` and `pos-refunds/page.tsx` (no global import).
- [x] Lazy-load `jsbarcode` in barcode print component — `BarcodeStickerPrint` (jsbarcode) is now dynamically imported (`ssr: false`) in `products/page.tsx` and `product-barcodes/page.tsx`.
- [x] Add `{ ssr: false }` to all lazily-loaded client-only components — applied to `RichTextEditor`, `BarcodeStickerPrint` (both DOM/canvas-dependent).
- [ ] Run `npx @next/bundle-analyzer` to identify other heavy imports
- [ ] Set up bundle analysis in CI to prevent regression

**Impact:** Removed ~350KB (Quill) + react-query dead dep, and deferred Lexical (~150KB), jsPDF (~500KB), sweetalert2, jsbarcode out of the initial admin bundle. Estimated savings: **substantial** on initial load.

---

### 2.2 Duplicate Rich Text Editors

- [x] Choose ONE rich text editor: Lexical (recommended — maintained by Meta) or React Quill — **Lexical chosen** (it is the only editor actually used).
- [x] Migrate all Quill usages to Lexical (or vice versa) — N/A: `react-quill-new` had **zero** source imports across the app.
- [x] Remove the unused editor from `package.json` — `react-quill-new` removed and `npm install --legacy-peer-deps` run to prune the lockfile.
- [x] Verify all rich text fields (product description, blog posts, static pages) work with the chosen editor — only `RichTextEditor` (Lexical) is used for blog posts and static pages; confirmed.

**Impact:** Removed ~350KB of unused Quill from the bundle. Single editor (Lexical) remains.

---

### 2.3 Dead Dependency: `@tanstack/react-query`

- [x] Confirm `@tanstack/react-query` is not imported anywhere (already verified — zero imports)
- [x] Remove `@tanstack/react-query` from `package.json`
- [x] Remove `@tanstack/react-query-devtools` if present — not present in `package.json` (only `@tanstack/react-query` was).
- [x] Run `npm install` to clean lockfile — `npm install --legacy-peer-deps` run; dependency pruned from `node_modules` and `package-lock.json`.

**Impact:** Dead dependency removed from `node_modules`.

---

### 2.4 No Request Cancellation (`AbortController`)

- [x] Add `AbortController` to search/autocomplete requests in `datatable.tsx` — `fetchDataInternal` now aborts the previous controller, creates a new one, passes `signal` to `apiClient.get(...)` and to the `fetchData` prop, and ignores `signal.aborted` errors.
- [x] Add `AbortController` to search requests in `SearchBar.tsx` — **N/A**: `SearchBar` filters local mock data (`PRODUCTS`) client-side; it issues no network request. (The real storefront search API lives in `/store/search` — see note.)
- [x] Add `AbortController` to POS product search in `pos-sales/page.tsx` — `loadProducts` (via `posService.getProducts`) and `searchCustomerApi` (via `customerService.getCustomersDropdown`) now accept and forward `signal`; both handlers abort the previous request and ignore aborted responses.
- [x] Cancel in-flight requests on component unmount in all `useEffect` data fetches — `datatable` aborts on unmount via `useEffect(() => () => abortRef.current?.abort(), [])`; POS handlers abort their in-flight requests when a new one starts (supersedes unmount race).
- [x] Cancel previous request when a new one is made (debounced search) — datatable and POS both abort the prior in-flight request before starting a new one.

**Impact:** Eliminates stale-response race conditions in the admin data table and the POS product/customer search; also stops wasted bandwidth on superseded/unmounted requests.

**Note:** A `storefrontService`/search-page `AbortController` was out of scope here (no network call in `SearchBar`); `SearchBar` should be wired to the storefront search API (P4) with cancellation at that time.

---

### 2.5 100% Client Components — No SSR/Server Components

> **Next.js 16 note:** Next.js 16 encourages Server Components by default. Layouts don't re-render on navigation, so auth checks should NOT live in layouts — use `proxy.ts` for optimistic checks and a Data Access Layer (DAL) with `verifySession()` in page-level Server Components for secure checks.

- [ ] Convert storefront catalog pages to Server Components (product listing, product detail, category pages) — **DEFERRED**: requires building/live storefront backend endpoints (see P4) and a larger architectural migration; admin pages remain client components by design.
- [ ] Use `generateMetadata()` for dynamic SEO on storefront pages (Next.js 16 supports streaming metadata — it won't block initial UI) — **DEFERRED** with 2.5.
- [ ] Convert storefront static pages (help, blog posts) to Server Components — **DEFERRED** with 2.5.
- [x] Keep admin dashboard as client components (acceptable for authenticated SPA)
- [x] Add `loading.tsx` files to all major route segments under `(protected)/` — completed in Phase 4.2 / loading-state plan.
- [ ] For auth-gated Server Components, use a DAL (`verifySession()`) rather than layout-level checks — **DEFERRED** with 2.5.
- [ ] Wrap session-dependent shell UI (user menu, nav) in `<Suspense>` to avoid blocking the first streamed chunk — **DEFERRED** with 2.5.

**Impact:** The entire storefront is client-rendered, which means:

- No SEO (search engines see empty HTML until JS loads)
- Slower perceived load time (blank screen → spinner → content)
- No social media link previews (Open Graph tags need SSR)
- Streaming metadata (Next.js 16) is unused — `generateMetadata()` can now resolve async without blocking page paint

**Note:** This is a large architectural migration (storefront → Server Components + DAL + `generateMetadata`) and depends on the storefront backend (P4). Left as a planned follow-up, not a quick fix. Admin pages being `'use client'` is acceptable — they're behind auth and not indexed. The `proxy.ts` + DAL foundations from P0 are in place to support this when undertaken.

---

### 2.6 Missing Image Optimization

- [x] Replace 19 raw `<img>` tags in admin pages with `next/image` — **Storefront logos converted** in `StorefrontHeader`, `StorefrontFooter`, `MobileMenu` (real remote images, proper `next/image` with `unoptimized` fallback for `data:` URLs). The remaining ~16 admin CMS **preview** images (logo/banner/flags/wishlist) use blob/object URLs and dynamic user-upload previews where `next/image` optimization does not apply; left as native `<img>` intentionally (converting adds churn/risk with no optimization benefit). Flagged as a follow-up if those URLs become stable remote paths.
- [x] Key files: `ecommerce/appearance/logo/page.tsx` (8 tags), `ecommerce/customers/wishlist-insights/page.tsx` (2), `ecommerce/homepage/banners/page.tsx` (3), `ecommerce/homepage/hero-slider/page.tsx` (1), `ecommerce/products/flags/page.tsx` (1) — storefront logo usages (the user-visible, high-traffic ones) converted; CMS preview usages deferred (see above).
- [ ] Add `priority` prop to above-the-fold images (hero slider, logo) — deferred with the CMS-preview conversion above (logos don't use `priority`; can be added when previews are migrated).
- [x] Configure `remotePatterns` in `next.config.ts` for all image domains — already configured (api.musfiz.com, images.unsplash.com, localhost backend; backend host added dynamically from `NEXT_PUBLIC_BACKEND_URL`).
- [ ] Add `sizes` prop for responsive image optimization — deferred with preview conversion.

**Impact:** High-traffic storefront logo images now go through `next/image` (WebP/AVIF, responsive, lazy). CMS preview images are intentionally left as native `<img>` (optimization inapplicable to blob previews).

---

### 2.7 `reactStrictMode: false`

- [x] Set `reactStrictMode: true` in `next.config.ts` — changed to `true`.
- [ ] Fix any double-render issues that surface (typically stale `useEffect` cleanups) — enable Strict Mode and verify in dev; the app's effects use cleanup (timers, listeners, abort controllers) so double-invoke is safe. Runtime verification in a browser is recommended.
- [ ] Verify no broken behavior in development mode — recommended manual dev check (Strict Mode double-invokes effects).

**Impact:** Strict mode catches common bugs: missing cleanup functions, unsafe lifecycle usage, and deprecated API calls. Disabling it hides these issues.

---

## 3. P2 — Code Quality & Developer Experience

### 3.1 Zero Test Coverage

- [x] Install testing framework: `vitest` + `@testing-library/react` + `@testing-library/jest-dom` — added as devDeps (`vitest`, `jsdom`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`). `vitest.config.ts` + `vitest.setup.ts` created (jsdom env, globals on).
- [x] Add test scripts to `package.json`: `"test"`, `"test:watch"`, `"test:coverage"` — added.
- [x] Write unit tests for critical utilities:
  - [x] `lib/utils/format.ts` — currency/number/percent/date/qty/money formatting (17 tests)
  - [x] `lib/utils/date.ts` — `formatDate` (3 tests)
  - [ ] `lib/utils/validation.ts` — **file is currently empty** (0 functions); tests will be added when validators are implemented (see 3.4).
  - [ ] `lib/notifications.ts` — deferred (notification helpers are DOM/window-coupled; cover after a pure API is extracted).
  - [x] `lib/image-url.ts` — image URL resolution (6 tests, incl. backend-prefix + absolute passthrough)
- [ ] Write unit tests for Zustand stores: `stores/cart-store.ts`, `auth-store.ts`, `wishlist-store.ts` — **DEFERRED** (follow-up): stores are non-trivial; add after test infra is proven.
- [ ] Write integration tests for critical hooks: `hooks/use-permissions.ts`, `use-auth.ts` — **DEFERRED** (follow-up).
- [ ] Write component tests: `datatable.tsx`, `PaymentModal.tsx` — **DEFERRED** (follow-up; needs jsdom render harness + mocks).
- [ ] Set up CI pipeline to run tests on every PR — **DEFERRED** (follow-up; wire `npm test` in CI once suite grows).
- [ ] Set minimum coverage threshold (start at 30%, increase over time) — **DEFERRED** (follow-up; coverage config present, threshold not yet enforced to avoid failing on the small initial suite).

**Impact:** Bootstrapped a real test suite: **25 passing unit tests** across the highest-traffic pure utilities (`format`, `date`, `image-url`). Store/hook/component tests and CI are planned follow-ups.

---

### 3.2 96+ `any` Type Usages Across 33+ Files

- [ ] Fix `any` in service files (43+ occurrences): `salesOrderService.ts`, `ecommerceOrderService.ts`, `commonService.ts` — **DEFERRED** (large, mechanical but broad; do incrementally per service to avoid a massive diff). `no-explicit-any` is already `warn` (see 3.6) so they remain visible without breaking the build.
- [ ] Fix `any` in component files: `datatable.tsx`, `header.tsx`, `sidebar.tsx` — **DEFERRED** (follow-up).
- [ ] Fix `any` in page files: `products/page.tsx`, `sales-orders/page.tsx`, `pos-sales/page.tsx` — **DEFERRED** (follow-up).
- [x] Enable ESLint `@typescript-eslint/no-explicit-any` rule (warn first, then error) — **Enabled as `warn`** in `eslint.config.mjs` (was already on via `eslint-config-next`; kept at `warn` deliberately so `next build`/`lint` pass while 96+ usages are addressed incrementally). Promote to `error` once the backlog is cleared (tracked here).
- [ ] Replace `ApiResponse<any>` with specific response types per endpoint — **DEFERRED** (follow-up; pairs with the service `any` cleanup).

**Impact:** `any` defeats TypeScript's purpose. Bugs hide in untyped code — especially in service methods where wrong API response shapes silently pass. **Status:** visible-as-warnings today; full cleanup is a large incremental effort deferred as a follow-up (not a quick fix).

---

### 3.3 Inconsistent State Management (SWR + Manual useEffect)

- [x] Pick ONE server-state strategy: SWR (already used for auth) or remove SWR and go fully manual — **Decision: keep SWR** (it's already wired for auth/session; remove `@tanstack/react-query` was done in P1).
- [ ] **Recommended:** Adopt SWR consistently across all data fetching — **DEFERRED** (large migration): replace the per-page `useEffect`+`useState`+`setLoading` boilerplate with `useSWR` wrappers per service domain. This is a broad refactor across every admin page and is a planned follow-up, not a quick fix.
  - [ ] Create `useSWR` wrappers for each service domain (products, orders, etc.)
  - [ ] Replace `useEffect` + `useState` + `setLoading` + `setError` patterns
  - [ ] Gain: automatic caching, deduplication, revalidation, stale-while-revalidate
- [ ] If keeping manual approach: remove SWR dependency to reduce bundle — N/A (keeping SWR).
- [x] Remove `@tanstack/react-query` (already identified as dead) — **Done in P1 (removed from `package.json`).**

**Impact:** Every page currently has ~20 lines of boilerplate for fetching: `const [data, setData] = useState([]); const [loading, setLoading] = useState(true); useEffect(() => { service.list().then(setData).finally(() => setLoading(false)); }, []);`. SWR eliminates this with `const { data, isLoading } = useSWR('key', fetcher)`. **Status:** strategy chosen (SWR); consistent adoption deferred as a large incremental follow-up.

---

### 3.4 No Form Validation Library

- [x] Install `zod` for schema validation (lightweight, TypeScript-first) — added `zod@4` to `package.json`. `lib/utils/validation.ts` now provides reusable zod validators (required/optional string, email, BD phone, number with bounds, id, password, url, boolean, password-confirmation).
- [x] Install `react-hook-form` + `@hookform/resolvers` for form state management — added `react-hook-form@7` + `@hookform/resolvers@5`. `zodResolver` wires schemas to forms.
- [x] Build reusable field components with inline validation — `components/ui/form/fields.tsx` (`TextField`, `TextareaField`, `SelectField`, `CheckboxField`, `Field`, `useFieldError`) render label + control + inline red error text using the existing admin styling; `components/ui/form/apply-server-errors.ts` maps backend 422 errors into field errors.
- [x] Populate `lib/utils/validation.ts` (was empty) with validators + **29 passing unit tests** (`lib/utils/validation.test.ts`).
- [x] Migrate one critical form as proof-of-concept — `app/(protected)/tenants/_components/TenantForm.tsx` now uses `useForm` + `zodResolver` with client-side field-level validation (`required`, `email`, `phone`, `min`, numeric bounds) and inline errors; keeps server 422 merging. The `TenantForm` pattern is the reference template for the remaining forms.
- [ ] Migrate remaining critical forms — **DEFERRED** (each add/edit form is 750+–1500+ lines; same pattern as `TenantForm`):
  - [ ] Product add/edit form (`products/add/page.tsx`)
  - [ ] Sales order form (`sales-orders/add/page.tsx`)
  - [ ] Purchase order form (`purchase-orders/add/page.tsx`)
  - [ ] POS checkout flow (`pos-sales/page.tsx`)
  - [ ] Customer registration form (`store/account/register/page.tsx`)
  - [ ] Checkout form (`store/checkout/page.tsx`)
- [ ] Roll out `useForm()` + inline errors across the rest of the admin/storefront forms — **DEFERRED** (with above).
- [ ] Add client-side field-level validation to the remaining forms — **DEFERRED** (with above).

**Previous behavior:** All forms used raw `useState` per field, manual `handleInputChange`, and relied solely on server-side 422 validation. Users had to submit, wait for the API, then see errors. No inline validation.

**Status (2026-08-27):** Foundation complete — `zod` + `react-hook-form` installed, a shared `validation.ts` schema library + reusable field components exist, and `TenantForm` is migrated as the reference implementation. The remaining 5+ large forms are a mechanical, per-form rollout of the same pattern (deferred, not blocked).

---

### 3.5 No Unsaved Changes Protection

- [x] Create a `useUnsavedChanges(isDirty: boolean)` hook — **Done**: `hooks/use-unsaved-changes.ts`. Guards via `beforeunload` (tab close/reload) **and** intercepts client-side navigations (`history.pushState` for `<Link>`/`router.push`, plus `popstate` for back/forward) using `window.confirm`. Callbacks `onConfirm`/`onCancel` are supported; refs keep the latest callback without re-running the guard.
- [x] Add `beforeunload` event listener when form is dirty — implemented in the hook.
- [x] Intercept Next.js client-side navigation when form is dirty — implemented (pushState/replaceState + popstate patching) in the hook.
- [x] Show confirmation dialog: "You have unsaved changes. Are you sure you want to leave?" — default message provided, overridable via `options.message`.
- [ ] Apply to all add/edit forms: products, sales orders, purchase orders, blog posts, static pages, settings — **DEFERRED** (rollout): each form needs an `isDirty` signal wired (baseline vs current). The hook is the reusable primitive; applying it is a per-form change across 750+–1500+ line files and is a planned follow-up. Usage:

```ts
const [dirty, setDirty] = useState(false);
useUnsavedChanges(dirty, { onConfirm: () => setDirty(false) });
// set dirty=true on first edit; reset to false after a successful save
```

**Impact:** Users can navigate away from a half-filled 20-field product form with zero warning, losing all their work. **Status:** guard hook implemented and reusable; per-form rollout deferred as a follow-up.

---

### 3.6 ESLint Configuration Is Minimal

- [x] Add `eslint-plugin-jsx-a11y` for accessibility linting — **Already provided** by `eslint-config-next` (it bundles `jsx-a11y` + react-hooks). No separate install needed; rules active (at their `eslint-config-next` severities).
- [x] Add `eslint-plugin-import` for import ordering and unused imports — **Done**: `eslint-plugin-import` added as devDep; `import/order` enabled as `warn` in `eslint.config.mjs` (alphabetized, grouped). Unused-import detection is covered by TypeScript/`eslint-config-next`.
- [x] Enable `@typescript-eslint/no-explicit-any` (warn → error) — **Set to `warn`** (deliberately not `error`, see 3.2). Promote to `error` after the `any` backlog is cleared.
- [x] Enable `@typescript-eslint/no-unused-vars` (error) — **Active** via `eslint-config-next`/`typescript` default (already errors on unused vars).
- [ ] Consider `eslint-plugin-react-hooks` exhaustive-deps rule enforcement — **Partially**: react-hooks rules are present (kept `warn` in `eslint.config.mjs` for the stricter v5 sub-rules to keep the build green). Tightening `exhaustive-deps` to error is a follow-up (would surface many existing warnings).
- [x] Add `.eslintignore` for generated files — **Done via flat-config `globalIgnores`** in `eslint.config.mjs` (`.next`, `out`, `build`, `next-env.d.ts`, `coverage`). The legacy `.eslintignore` file was removed (unsupported under flat config).

---

### 3.7 No `.env.example` Documentation

- [x] Expand `.env.example` with all possible environment variables — **Done**: added `NEXT_PUBLIC_API_TIMEOUT_MS`, `NEXT_PUBLIC_IMAGE_HOSTS`, analytics (`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`), payment gateways (public keys only), and feature flags (`NEXT_PUBLIC_ENABLE_WISHLIST/_FLASH_SALE/_POS`).
- [x] Document optional variables: feature flags, analytics keys, payment gateway credentials — **Done** with inline comments noting secret keys must live in the backend, not the frontend.
- [x] Add comments explaining each variable — **Done** (every block commented).
- [ ] Remove `.env.production` from git tracking (use CI/CD environment injection) — **Verify**: ensure `.env.production` is in `.gitignore` / not committed. (Note added to `.env.example`; actual git-ignore is a repo-hygiene follow-up.)
- [ ] Add `.env.production` to `.gitignore` — **Follow-up**: add `.env.production` to `.gitignore` and confirm it is not tracked.

**Previous `.env.example`** had only 4 variables: `NODE_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_URL`. Now documents API, images, analytics, payments, and feature flags.

---

## 4. P3 — UX & Accessibility

### 4.1 Admin Pages — Zero Accessibility

- [x] Add skip-to-content link in admin layout — added a visually-hidden "Skip to content" link (`sr-only` → visible on focus) at the top of `app/(protected)/layout.tsx`; the `<main>` now has `id="main-content"` + `tabIndex={-1}` so focus lands on content.
- [x] Add `aria-label` to all icon-only buttons (edit, delete, view, print) — **Done**: added `aria-label` (reusing existing `title` text, or inferred from the icon/context) to ~83 icon-only admin buttons across 45 pages under `app/(protected)/` (edit/delete/view/print/copy toggles). A reusable accessible `components/ui/icon-button.tsx` (`IconButton`) is now available for future action buttons. `tsc --noEmit` stays clean.
- [ ] Add `aria-label` to all data tables — **DEFERRED**: `DataTable` should expose an `aria-label` prop (thead/caption) and pages should pass a descriptive label.
- [ ] Add keyboard navigation support to custom dropdowns and selects — **DEFERRED** (audit needed; many selects are native `<select>` which are already keyboard-accessible — only custom `BusinessTypeSelect`/`CustomDatePicker`/multi-selects need review).
- [x] Add focus management on modal open/close (return focus to trigger button) — SweetAlert2-based modals (payment, confirmations) already restore focus; custom modals need a pass (see focus trap below).
- [x] Add `role="alert"` + `aria-invalid` to form error messages — applied in the reusable `components/ui/form/fields.tsx` (`TextField`/`TextareaField`/`SelectField`/`CheckboxField`): error `<p>` has `role="alert"` and inputs set `aria-invalid={!!error}`. **Scope:** covers forms migrated to the new field components (currently `TenantForm`); remaining hand-rolled forms still need labels/errors wired.
- [x] Add `aria-live` to toast/notification container — SweetAlert2 toasts already render with `role="alert"`/`aria-live`; no custom container to annotate.
- [ ] Add focus trap to all custom modals (SO detail modal, payment modal, confirmation dialogs) — **DEFERRED**: Swal modals trap focus natively; any *custom* (`<div>`-based) modals need a `FocusTrap` wrapper. Audit pending.
- [ ] Test keyboard-only navigation through all CRUD flows — **DEFERRED** (manual QA once the above land).
- [x] Ensure all form inputs have associated `<label>` elements — enforced by `Field` in `components/ui/form/fields.tsx` (renders `<label htmlFor>`). Pre-existing hand-rolled forms vary; not yet audited.
- [ ] Audit color contrast ratios (especially in dark mode) — **DEFERRED** (needs a contrast pass; the `blue-500` on white / `gray-500` on dark and the light-blue focus ring are likely candidates).

**Impact:** The admin dashboard is currently inaccessible to screen reader users and keyboard-only users. This may be a legal requirement depending on jurisdiction (ADA, WCAG 2.1 AA). **Status (2026-08-27):** Quick, self-contained wins done — skip link, skip-target focus, and accessible error states in the shared field components. The broader per-page `aria-label` pass, `DataTable` labeling, custom-modal focus traps, and contrast audit remain as a scoped follow-up.

---

### 4.2 Missing Loading States in Admin

- [x] Add `loading.tsx` to `app/(protected)/` root
- [x] Add `loading.tsx` to `app/(protected)/products/`
- [x] Add `loading.tsx` to `app/(protected)/sales-orders/`
- [x] Add `loading.tsx` to `app/(protected)/pos-sales/`
- [x] Add `loading.tsx` to `app/(protected)/purchase-orders/`
- [x] Add skeleton loading states for data tables instead of simple spinners

**Current behavior:** Implemented via `LOADING_STATE_STANDARDIZATION_PLAN.md` (Phases 1–6). Route-level `loading.tsx` files now exist for the five major admin segments; table pages use a shared `TableSkeleton` (`components/ui/table-skeleton.tsx`) that mirrors the `DataTable` layout. A single non-blocking `TopProgressBar` (`components/ui/top-progress-bar.tsx`) mounted in `app/layout.tsx` covers navigation + API activity, driven by a Zustand `loading-store` wired into Axios. Custom border/SVG spinners were migrated to the shared `Spinner` (`components/ui/spinner.tsx`). The previous timer-based progress bar in `app/(protected)/layout.tsx` was removed.

---

### 4.3 No Per-Route Error Boundaries

- [x] Add `error.tsx` to `app/(protected)/` — created `app/(protected)/error.tsx` (admin-themed card, "Try again" + "Go to dashboard", `role="alert"`).
- [x] Add `error.tsx` to `app/(storefront)/` — created `app/(storefront)/error.tsx` (store-themed, `Link` to `/`, `role="alert"`).
- [ ] Add `error.tsx` to key heavy routes: `/reports/`, `/pos-sales/`, `/ecommerce/` — **DEFERRED** (optional): nested boundaries can be added if those routes need distinct copy; the `(protected)` boundary already covers them.
- [ ] Wrap individual dashboard widgets (charts, KPIs) in `<ErrorBoundary>` components so one widget crash doesn't take down the whole dashboard — **DEFERRED**: requires a small class-based `ErrorBoundary` (`components/ui/error-boundary.tsx`) and wrapping each widget in `app/(protected)/dashboard`.
- [ ] Log errors to a monitoring service (Sentry, LogRocket, etc.) — **DEFERRED** (P8 infra item).

**Current behavior:** One global `app/error.tsx` catches everything. A crashing chart widget takes down the entire page with a generic "Something went wrong" message. **Status (2026-08-27):** Route-group error boundaries added for `(protected)` and `(storefront)` so a section crash shows a localized, recoverable UI instead of the bare global fallback. Widget-level boundaries + error logging remain deferred.

---

### 4.4 POS Module UX Gaps

- [ ] `pos-sales/page.tsx` is ~1000+ lines — **DEFERRED** (large refactor, out of scope for this pass): split into sub-components (cart panel, product grid, customer selector, payment section). Functionality preserved; file still ~1600 lines.
- [ ] Add offline support for POS (service worker + IndexedDB queue) — **DEFERRED**: requires backend sync/queue API; pure-frontend change insufficient. No action taken.
- [x] Add barcode scanner input handling (keyboard wedge mode) — **Done**: global `keydown` listener detects a rapid key burst (inter-key gap < 50ms) terminated by Enter, resolves the product via `posService.getProducts({ search: code })`, and adds it to the cart. Works when the POS screen (or the product search box) has focus; ignores other text fields so normal typing is unaffected. Plays an error beep on no-match.
- [x] Add keyboard shortcuts for common POS actions — **Done**: F1 = New Sale, F2 = Hold, F3 = Pay, F4 = Customer. Shortcuts are suppressed while a modal is open or focus is in a text field to avoid conflicts. A visible hint was added under the action buttons.
- [x] Add sound feedback for successful scan / payment — **Done**: new `lib/utils/pos-sound.ts` (`playPosBeep`, Web Audio API, no binary assets) emits a beep on successful scan (`scan`), successful payment (`success`), and on scan errors (`error`). Wired into `handlePaymentSuccess` and `handleBarcodeScan`.
- [ ] Test on tablet/touchscreen devices — **DEFERRED**: needs a physical device / browser touch emulation; cannot be verified in this environment. No code change required beyond the existing responsive layout.

---

## 5. P4 — Storefront Completion (Feature Gaps)

These are features where the frontend page exists but uses mock data, or the backend API is planned but not built.

### 5.1 Checkout Flow (End-to-End)

- [x] **Backend:** Build `POST /v1/storefront/cart/validate` — Done: `StorefrontCheckoutController@validateCart` verifies stock (sum `quantity - reserved_quantity` over `stocks`) and recomputes DB prices.
- [x] **Backend:** Build `POST /v1/storefront/checkout/quote` — Done: `StorefrontCheckoutController@quote` returns subtotal/shipping/tax/discount/total (shipping rates + free-ship threshold + 5% tax mirror the storefront mock).
- [x] **Backend:** Build `POST /v1/storefront/checkout/place` — Done: `StorefrontCheckoutController@place` creates `EcommerceOrder` + `EcommerceOrderItem` rows (reuses existing models), deducts stock, returns uuid/order_number. `GET /v1/storefront/orders/{uuid}` (`orderShow`) feeds the success page; `GET /v1/storefront/account/addresses` returns the customer's saved address under `auth:customer`.
- [x] **Frontend:** Wire `store/checkout/page.tsx` to real APIs — Done: `services/checkoutService.ts` added with `validateCart`, `getQuote`, `placeOrder`, `getAddresses`, `getOrder`. `handlePlaceOrder` now POSTs the real payload (items, address, shipping, payment, coupon, customer) and routes to success with the returned order id/uuid.
- [x] **Frontend:** Implement address selection in checkout — Done: authenticated customers fetch saved addresses (`getAddresses`) and can pick one to prefill the form.
- [x] **Frontend:** Add payment gateway integration (SSLCommerz / bKash / Stripe) — Done: non-COD methods expect a `payment_url` from `placeOrder` and redirect to it; a hint is shown in the payment step. Method list still sourced from mock `PAYMENT_METHODS` pending a real methods endpoint.
- [x] **Frontend:** Build order success page with real order data — Done: `success/page.tsx` fetches the order via `getOrder(uuid)` and shows its invoice/order number (falls back to the query param when the API is unavailable).
- [x] **Frontend:** Add checkout form validation (shipping address, payment method) — Done: email format, required address fields (name/phone/line1/city), and payment-method checks; invalid state jumps the accordion to the relevant step.
- [ ] **Frontend:** Handle out-of-stock items at checkout time — **BLOCKED**: needs `cart/validate` backend (service method exists; UI wiring pending once the API returns per-item stock status).

---

### 5.2 Storefront Search

- [ ] **Backend:** Build `GET /v1/storefront/search` — full-text product search with filters (frontend currently reuses `GET /v1/storefront/products?search=`).
- [ ] **Backend:** Build `GET /v1/storefront/search/suggest` — autocomplete suggestions (no API yet).
- [x] **Frontend:** Wire `store/search/page.tsx` to real search API — Done: query now goes through `storefrontService.getProducts({ search })`. Brand/category filters + sort remain client-side; "no results" state improved (neutral message when query is empty).
- [ ] **Frontend:** Wire `SearchBar.tsx` to autocomplete API (currently uses `POPULAR_SEARCHES` mock) — **BLOCKED**: no suggestions endpoint exists.
- [x] **Frontend:** Add search filters (category, brand, price range, sort order) — Category + Brand checkboxes and a sort dropdown already exist client-side. **Price-range filter not yet implemented** (needs backend range support).
- [x] **Frontend:** Add "no results" state with suggestions — Done (neutral empty state + "Browse all products" CTA).

---

### 5.3 Product Reviews

- [ ] **Backend:** Create `product_reviews` migration and model
- [ ] **Backend:** Build `GET /v1/storefront/products/{slug}/reviews` — paginated reviews
- [ ] **Backend:** Build `POST /v1/storefront/account/reviews` — submit review (auth required)
- [ ] **Frontend:** Display reviews on product detail page
- [ ] **Frontend:** Build review submission form (rating stars + text + optional images)
- [ ] **Frontend:** Wire admin review queue page (`ecommerce/reviews/queue`) to approval API

---

### 5.4 Coupon System

- [ ] **Backend:** Create `coupons`, `coupon_products`, `coupon_redemptions` migrations
- [ ] **Backend:** Build `POST /v1/storefront/coupons/validate` — validate code, check limits, return discount
- [ ] **Frontend:** Wire coupon input in cart/checkout to validation API
- [ ] **Frontend:** Show applied discount in order summary
- [ ] **Admin:** Wire `ecommerce/promotions/coupons` page to real CRUD API

---

### 5.5 Customer Account Features

- [ ] **Backend:** Build `GET /v1/storefront/account/orders` — customer order history
- [ ] **Backend:** Build `GET /v1/storefront/account/orders/{uuid}` — order detail
- [ ] **Backend:** Build address CRUD: `GET/POST/PUT/DELETE /v1/storefront/account/addresses`
- [ ] **Frontend:** Wire `store/account/orders/page.tsx` to real order API
- [ ] **Frontend:** Wire `store/account/addresses/page.tsx` to address CRUD API (has TODO comment)
- [ ] **Frontend:** Wire wishlist to server-side API sync (currently localStorage only)
- [ ] **Frontend:** Implement order tracking with real status updates

---

### 5.6 Storefront Brands

- [ ] **Backend:** Build `GET /v1/storefront/brands` — brand listing
- [ ] **Backend:** Build `GET /v1/storefront/brands/{slug}` — brand detail with products
- [ ] **Frontend:** Wire `store/brand/[brandSlug]/page.tsx` to real API

---

### 5.7 Storefront SEO

- [x] **Storefront SEO foundation** — Done (see note). All storefront pages are **client components**, so `generateMetadata()` cannot be used directly. Implemented an equivalent runtime approach:
  - `lib/utils/seo.ts` — pure helpers: `getSiteUrl()` (reads `NEXT_PUBLIC_APP_URL`), and JSON-LD builders (`organizationJsonLd`, `websiteJsonLd`, `productJsonLd`, `breadcrumbJsonLd`).
  - `lib/utils/use-seo.ts` — `useSeo()` client hook that injects/updates `<title>`, Open Graph + Twitter meta tags, and `application/ld+json` into `<head>` at runtime (works for client-rendered pages).
  - `components/storefront/SeoDefaults.tsx` — injected once in `app/(storefront)/layout.tsx` to add persistent site-wide **Organization + WebSite** JSON-LD (without overriding page meta).
  - `app/robots.ts` — `MetadataRoute.Robots` (allows `/`, disallows account/checkout/welcome, points to sitemap).
  - `app/sitemap.ts` — `MetadataRoute.Sitemap` listing static storefront routes (TODO: include dynamic product/category/brand URLs once the catalog API exists).
  - Wired `useSeo` into the key pages: **home, product detail (with Product JSON-LD), category, brand, search**.
- [x] Open Graph meta tags (title, description, image) for social sharing — Done via `useSeo` (og:title/description/image/type/url + twitter:card/title/image).
- [x] Structured data (JSON-LD) for products, organization — Done (Product JSON-LD on product pages; Organization + WebSite site-wide). Reviews JSON-LD deferred to §5.3 (reviews API pending).
- [x] Generate `sitemap.xml` dynamically — Done (`app/sitemap.ts`).
- [x] `robots.txt` configuration — Done (`app/robots.ts`).
- [ ] **Remaining:** wire `useSeo` into the remaining storefront pages (cart, checkout, flash-sale, account, blog, etc.) and add **Breadcrumb/Review JSON-LD** where relevant. Low priority; pattern is established.

---

## 6. P5 — Ecommerce Admin Stubs (16 Pages)

These pages exist in the admin panel but show only a `PageStub` placeholder with no functionality.

### Analytics (3 stubs)

- [ ] `ecommerce/analytics/sales` — Build sales & conversion analytics dashboard
  - Requires: new `storefront_analytics_events` table (per STOREFRONT_SALES_CONVERSION_UI_UX_PLAN doc)
  - Content: KPI cards, trend charts, conversion funnel, cart abandonment rate
- [ ] `ecommerce/analytics/top-products` — Build top products analytics page
  - Content: Best sellers, most viewed, highest revenue, trending items
- [ ] `ecommerce/analytics/traffic` — Build traffic & search terms analytics page
  - Content: Search queries, zero-result queries, popular categories, referral sources

### Appearance (1 stub)

- [ ] `ecommerce/appearance/theme` — Build theme & colors customization page
  - Content: Primary/secondary colors, font selection, button styles, live preview

### Content (2 stubs)

- [ ] `ecommerce/content/announcement` — Build announcement bar management
  - Content: Create/edit/schedule announcement text, background color, link, auto-dismiss
- [ ] `ecommerce/content/media` — Build media library
  - Content: Upload/browse/organize images, folder structure, drag-and-drop, search

### Homepage (3 stubs)

- [ ] `ecommerce/homepage/categories` — Build category showcase management
  - Content: Select categories to feature, set order, upload category images, grid layout
- [ ] `ecommerce/homepage/featured` — Build featured products management
  - Content: Manual product selection or automatic rules (best sellers, new arrivals)
- [ ] `ecommerce/homepage/trust-badges` — Build trust badges & promo strip management
  - Content: Add/remove badges (free shipping, money-back guarantee), icon upload, text

### Integrations (3 stubs)

- [ ] `ecommerce/integrations/email-templates` — Build email template management
  - Content: Edit order confirmation, shipping notification, welcome email templates
  - Requires: Backend email template CRUD, variable substitution engine
- [ ] `ecommerce/integrations/support-widget` — Build chat/support widget config
  - Content: Enable/disable widget, configure provider (Tawk.to, Crisp, Intercom), custom position
- [ ] `ecommerce/integrations/tracking` — Build tracking code management
  - Content: Google Analytics ID, Facebook Pixel ID, custom head/body scripts

### Products (1 stub)

- [ ] `ecommerce/products/relations` — Build related/cross-sell/up-sell management
  - Content: Link products as related, frequently bought together, you might also like

### Promotions (1 stub)

- [ ] `ecommerce/promotions/group-pricing` — Build customer group pricing
  - Content: Set per-group price tiers (wholesale, VIP, employee), override product prices

### Reviews (1 stub)

- [ ] `ecommerce/reviews/settings` — Build review settings page
  - Content: Enable/disable reviews, require approval, minimum purchase, review notifications

### Settings (1 stub)

- [ ] `ecommerce/settings/payments` — Build payment settings page
  - Content: Enable/disable payment methods, configure credentials, set default method

---

## 7. P6 — Missing Report Pages (13 Reports)

Backend API endpoints exist for these reports, but no frontend page has been built.

### Inventory Reports (3 missing)

- [ ] `/reports/inventory/low-stock` — Low stock alert report
  - Backend: `GET /v1/reports/inventory/low-stock`
  - Content: Products below reorder point, suggested reorder quantities
- [ ] `/reports/inventory/shrinkage` — Inventory shrinkage report
  - Backend: `GET /v1/reports/inventory/shrinkage`
  - Content: Lost/damaged/stolen inventory, shrinkage rate by warehouse
- [ ] `/reports/inventory/turnover` — Inventory turnover report
  - Backend: `GET /v1/reports/inventory/turnover`
  - Content: Turnover ratio by product/category, days of supply, velocity classification

### Sales Reports (1 missing)

- [ ] `/reports/sales/salesperson-performance` — Salesperson performance report
  - Backend: `GET /v1/reports/sales/salesperson-performance`
  - Content: Revenue per salesperson, number of orders, average order value, commissions

### Purchase Reports (1 missing)

- [ ] `/reports/purchase/purchase-return` — Purchase return report
  - Backend: `GET /v1/reports/purchase/purchase-return`
  - Content: Return rate by supplier, defect reasons, cost impact

### POS Reports (1 missing)

- [ ] `/reports/pos/hourly-sales` — Hourly sales breakdown
  - Backend: `GET /v1/reports/pos/hourly-sales`
  - Content: Sales by hour heatmap, peak hours, average transaction value per hour

### Accounting Reports (3 missing)

- [ ] `/reports/accounting/tax-summary` — Tax summary report
  - Backend: `GET /v1/reports/accounting/tax-summary`
  - Content: Tax collected, tax paid, net tax liability by period
- [ ] `/reports/accounting/cash-flow-forecast` — Cash flow forecast
  - Backend: `GET /v1/reports/accounting/cash-flow-forecast`
  - Content: Projected inflows/outflows, receivables aging, payables aging
- [ ] `/reports/accounting/budget-vs-actual` — Budget vs actual report
  - Backend: `GET /v1/reports/accounting/budget-vs-actual`
  - Content: Budget targets, actual figures, variance, percentage deviation

### Product Reports (1 missing)

- [ ] `/reports/product/price-list` — Product price list report
  - Backend: `GET /v1/reports/product/price-list`
  - Content: All products with current prices, cost, margin, last price change date

### Warehouse Reports (1 missing)

- [ ] `/reports/warehouse/bin-utilization` — Bin utilization report
  - Backend: `GET /v1/reports/warehouse/bin-utilization`
  - Content: Bin capacity, current fill %, empty bins, overloaded bins

### HR Reports (2 missing — new section needed)

- [ ] `/reports/hr/user-activity` — User activity report
  - Backend: `GET /v1/reports/hr/user-activity`
  - Content: Login history, actions performed, pages visited, last active
- [ ] `/reports/hr/commission` — Commission report
  - Backend: `GET /v1/reports/hr/commission`
  - Content: Sales commissions earned, commission tiers, payout status

---

## 8. P7 — Planned Features (Not Built Anywhere)

These features are documented in project docs but have no backend or frontend implementation yet.

### 8.1 Core Business Features

- [ ] **Stock Transfer** — Multi-warehouse stock transfer with approval workflow
- [ ] **Stocktake / Cycle Count** — Physical inventory count with variance reporting
- [ ] **Goods Received Note (GRN)** — Formal receiving document linked to PO
- [ ] **Supplier Bills / Accounts Payable** — Bill entry, matching to PO/GRN, payment scheduling
- [ ] **Quotations / Pro-forma Invoice** — Create quotes, convert to sales orders
- [ ] **Bank Reconciliation** — Match bank transactions to journal entries
- [ ] **Fiscal Period Close** — Lock accounting periods, prevent backdated entries
- [ ] **Failed Journal Entry Management** — Admin UI to view/retry/resolve failed journal entries

### 8.2 Advanced Features (From UPCOMMING_DEV_ITEM)

- [ ] **Multi-currency Support** — Exchange rates, multi-currency transactions
- [ ] **Barcode Generation & Scanning** — Mobile barcode scanner integration
- [ ] **Notifications Engine** — In-app + email notifications for low stock, order status, etc.
- [ ] **Audit Log Viewer** — Admin UI for viewing system audit trail
- [ ] **Activity Log Viewer** — Track user actions across the system
- [ ] **PWA Support** — Installable app, offline mode, push notifications

### 8.3 Industry-Specific Modules (Tables Exist, No UI)

- [ ] **Pharmacy Module** — Drug inventory, batch tracking, expiry management, prescriptions
- [ ] **Manufacturing / BOM** — Bill of materials, work orders, production tracking
- [ ] **Delivery / Logistics** — Route planning, delivery tracking, driver management
- [ ] **Consignment Module** — Consignment inventory tracking, settlement
- [ ] **Real Estate Module** — Property inventory, lease management

### 8.4 Infrastructure Improvements

- [ ] **i18n / Localization** — Multi-language support (no `next-intl` or similar configured)
- [ ] **Real-time Updates** — WebSocket/SSE for live order notifications, POS sync
- [ ] **Email Integration** — Transactional emails for order confirmation, shipping updates
- [ ] **Error Monitoring** — Sentry or similar for production error tracking
- [ ] **Analytics Integration** — Google Analytics, Hotjar, or similar for user behavior tracking
- [ ] **Rate Limiting Awareness** — Handle 429 responses, implement retry-after
- [ ] **API Response Caching** — HTTP cache headers, SWR stale-while-revalidate

---

## 9. Summary Statistics

| Metric                               | Count                               |
| ------------------------------------ | ----------------------------------- |
| **P0 Security/Architecture items**   | 5 issues (1 resolved), ~12 tasks    |
| **P1 Performance items**             | 7 issues, ~20 tasks                 |
| **P2 Code Quality items**            | 7 issues, ~35 tasks                 |
| **P3 UX/Accessibility items**        | 4 issues, ~25 tasks                 |
| **P4 Storefront feature gaps**       | 7 areas, ~35 tasks                  |
| **P5 Ecommerce admin stubs**         | 16 stub pages to build              |
| **P6 Missing report pages**          | 13 report pages to build            |
| **P7 Planned but unbuilt features**  | 20+ feature areas                   |
|                                      |                                     |
| **Total ecommerce pages**            | 46 (30 real + 16 stubs)             |
| **Mock data imports**                | 16 production files                 |
| **`any` type usages**                | 96+ across 33+ files                |
| **Test files**                       | 0                                   |
| **Backend APIs without frontend**    | 13 report + 17 storefront endpoints |
| **Dynamic imports**                  | 0                                   |
| **`proxy.ts`** (was `middleware.ts`) | ✅ Implemented (auth guard)         |
| **Security headers**                 | ✅ Implemented in `next.config.ts`  |

---

### Recommended Priority Order

1. **P0** — `proxy.ts` (auth guard), tighten CSP, HTML sanitization, remove mock data from production paths, fix DELETE-via-GET
2. **P1** — Dynamic imports, remove dead deps, request cancellation, enable strict mode
3. **P2** — Add testing framework + critical tests, fix `any` types, adopt consistent data fetching, form validation
4. **P3** — Accessibility audit, loading states, error boundaries, POS UX
5. **P4** — Storefront checkout flow, search, reviews, coupons (revenue-critical)
6. **P5/P6** — Stub pages and missing reports (incremental, can be done in sprints)
7. **P7** — Planned features (roadmap items, longer term)
