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

### 1.1 No `middleware.ts` — Client-Side Auth Only

- [ ] **Create `middleware.ts`** in the project root
- [ ] Protect all `/dashboard`, `/products`, `/sales-orders`, etc. routes server-side
- [ ] Redirect unauthenticated users to `/login` before any page HTML is sent
- [ ] Redirect authenticated users away from `/login` to `/dashboard`
- [ ] Protect `/store/account/*` routes for customer auth
- [ ] Remove the 5-second timeout fallback hack in `app/(protected)/layout.tsx`
- [ ] Eliminate "flash of protected content" for unauthenticated visits

**Current behavior:** Auth is checked via `useEffect` + `useAuth({ middleware: 'auth' })` inside the client layout. Unauthenticated users see a loading spinner for up to 5 seconds, then get redirected. A direct URL hit shows protected HTML before the JS hydrates.

**Fix:** Next.js `middleware.ts` with cookie-based session validation runs at the edge before any page renders.

---

### 1.2 No Security Headers (CSP, X-Frame-Options, etc.)

- [ ] Add `headers()` function to `next.config.ts`
- [ ] Set `Content-Security-Policy` — restrict `script-src`, `style-src`, `img-src`, `frame-ancestors`
- [ ] Set `X-Frame-Options: DENY` (prevent clickjacking)
- [ ] Set `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
- [ ] Set `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Set `Permissions-Policy` to disable unused browser APIs (camera, microphone, geolocation)
- [ ] Set `Strict-Transport-Security` for HTTPS enforcement

**Risk:** Without CSP, the app is vulnerable to XSS via injected scripts. Without `X-Frame-Options`, any site can embed the admin panel in an iframe for clickjacking attacks.

---

### 1.3 No HTML Sanitization for Rich Text Content

- [ ] Install and configure `dompurify` (already in `package-lock.json`, just unused)
- [ ] Sanitize all user-generated HTML before rendering: product descriptions, blog posts, static pages, announcement bars
- [ ] Create a shared `<SafeHTML content={html} />` component that sanitizes via DOMPurify
- [ ] Audit all `dangerouslySetInnerHTML` usage across the codebase
- [ ] Sanitize rich text editor output before saving to API (defense in depth)

**Risk:** Product descriptions, blog posts, and static pages accept rich text (Lexical/Quill). If an admin enters `<script>` tags or event handlers, they render unsanitized on the storefront — classic stored XSS.

---

### 1.4 Mock Data in 16 Production Storefront Files

- [ ] Replace mock imports in `store/page.tsx` — use `storefrontService` for promo banners
- [ ] Replace mock imports in `store/cart/page.tsx` — use cart store + real product data
- [ ] Replace mock imports in `store/checkout/page.tsx` — use real cart + checkout API
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
- [ ] Delete `lib/storefront/mock-data.ts` after all imports are replaced
- [ ] Verify no `console.warn('...using mock data')` patterns remain

**Risk:** The storefront currently displays hardcoded fake products, prices, and orders to real users. Any storefront deployment shows fabricated data.

---

### 1.5 DELETE Operations via GET Request

- [ ] Change `productService.deleteProduct()` from `apiClient.get('/products/destroy/${id}')` to `apiClient.delete('/products/${id}')`
- [ ] Audit all other services for similar GET-for-delete patterns
- [ ] Coordinate with backend — ensure `DELETE /api/v1/products/{id}` route exists

**Risk:** GET requests can be triggered by browser prefetch, link crawlers, search engine bots, and proxy caches. A search engine indexing `/products/destroy/5` would delete product #5.

---

## 2. P1 — Performance & Bundle (High Impact)

### 2.1 Zero Dynamic Imports

- [ ] Lazy-load `Lexical` editor components with `next/dynamic` (saves ~150KB)
- [ ] Lazy-load `react-quill-new` with `next/dynamic` (saves ~200KB)
- [ ] Lazy-load `recharts` components with `next/dynamic` (saves ~300KB)
- [ ] Lazy-load `jspdf` + `html2canvas` in print components (saves ~500KB)
- [ ] Lazy-load `sweetalert2` — or switch to a lighter toast library
- [ ] Lazy-load `jsbarcode` in barcode print component
- [ ] Add `{ ssr: false }` to all lazily-loaded client-only components
- [ ] Run `npx @next/bundle-analyzer` to identify other heavy imports
- [ ] Set up bundle analysis in CI to prevent regression

**Impact:** Every admin page currently ships the full Lexical + Quill + Recharts + jsPDF bundle even if the page is a simple list view. Estimated savings: **1MB+** on initial load.

---

### 2.2 Duplicate Rich Text Editors

- [ ] Choose ONE rich text editor: Lexical (recommended — maintained by Meta) or React Quill
- [ ] Migrate all Quill usages to Lexical (or vice versa)
- [ ] Remove the unused editor from `package.json`
- [ ] Verify all rich text fields (product description, blog posts, static pages) work with the chosen editor

**Impact:** Two competing editors add ~350KB to the bundle for zero benefit. Lexical is more modern and extensible.

---

### 2.3 Dead Dependency: `@tanstack/react-query`

- [ ] Confirm `@tanstack/react-query` is not imported anywhere (already verified — zero imports)
- [ ] Remove `@tanstack/react-query` from `package.json`
- [ ] Remove `@tanstack/react-query-devtools` if present
- [ ] Run `npm install` to clean lockfile

**Impact:** Dead dependency adds to `node_modules` size and potential confusion. Currently installed but never used.

---

### 2.4 No Request Cancellation (`AbortController`)

- [ ] Add `AbortController` to search/autocomplete requests in `datatable.tsx`
- [ ] Add `AbortController` to search requests in `SearchBar.tsx`
- [ ] Add `AbortController` to POS product search in `pos-sales/page.tsx`
- [ ] Cancel in-flight requests on component unmount in all `useEffect` data fetches
- [ ] Cancel previous request when a new one is made (debounced search)

**Impact:** Without cancellation, stale responses from slow requests can overwrite fresh data (race condition). Also wastes bandwidth on unmounted components.

---

### 2.5 100% Client Components — No SSR/Server Components

- [ ] Convert storefront catalog pages to Server Components (product listing, product detail, category pages)
- [ ] Use `generateMetadata()` for dynamic SEO on storefront pages
- [ ] Convert storefront static pages (help, blog posts) to Server Components
- [ ] Keep admin dashboard as client components (acceptable for authenticated SPA)
- [ ] Add `loading.tsx` files to all major route segments under `(protected)/`

**Impact:** The entire storefront is client-rendered, which means:

- No SEO (search engines see empty HTML until JS loads)
- Slower perceived load time (blank screen → spinner → content)
- No social media link previews (Open Graph tags need SSR)

**Note:** Admin pages being `'use client'` is acceptable — they're behind auth and not indexed by search engines.

---

### 2.6 Missing Image Optimization

- [ ] Replace 19 raw `<img>` tags in admin pages with `next/image`
- [ ] Key files: `ecommerce/appearance/logo/page.tsx` (8 tags), `ecommerce/customers/wishlist-insights/page.tsx` (2), `ecommerce/homepage/banners/page.tsx` (3), `ecommerce/homepage/hero-slider/page.tsx` (1), `ecommerce/products/flags/page.tsx` (1)
- [ ] Add `priority` prop to above-the-fold images (hero slider, logo)
- [ ] Configure `remotePatterns` in `next.config.ts` for all image domains
- [ ] Add `sizes` prop for responsive image optimization

**Impact:** Raw `<img>` tags skip WebP/AVIF conversion, responsive sizing, and lazy loading — all provided automatically by `next/image`.

---

### 2.7 `reactStrictMode: false`

- [ ] Set `reactStrictMode: true` in `next.config.ts`
- [ ] Fix any double-render issues that surface (typically stale `useEffect` cleanups)
- [ ] Verify no broken behavior in development mode

**Impact:** Strict mode catches common bugs: missing cleanup functions, unsafe lifecycle usage, and deprecated API calls. Disabling it hides these issues.

---

## 3. P2 — Code Quality & Developer Experience

### 3.1 Zero Test Coverage

- [ ] Install testing framework: `vitest` + `@testing-library/react` + `@testing-library/jest-dom`
- [ ] Add test scripts to `package.json`: `"test"`, `"test:watch"`, `"test:coverage"`
- [ ] Write unit tests for critical utilities:
  - [ ] `lib/utils/format.ts` — currency formatting, number formatting
  - [ ] `lib/utils/date.ts` — date formatting
  - [ ] `lib/utils/validation.ts` — form validation
  - [ ] `lib/notifications.ts` — notification helpers
  - [ ] `lib/image-url.ts` — image URL resolution
- [ ] Write unit tests for Zustand stores:
  - [ ] `stores/cart-store.ts` — add/remove/update cart items, coupon application
  - [ ] `stores/auth-store.ts` — login/logout/switch-user state transitions
  - [ ] `stores/wishlist-store.ts` — add/remove/toggle wishlist
- [ ] Write integration tests for critical hooks:
  - [ ] `hooks/use-permissions.ts` — permission checking logic
  - [ ] `hooks/use-auth.ts` — auth flow
- [ ] Write component tests for critical UI:
  - [ ] `components/ui/datatable.tsx` — search, sort, pagination
  - [ ] `components/pos/PaymentModal.tsx` — payment flow
- [ ] Set up CI pipeline to run tests on every PR
- [ ] Set minimum coverage threshold (start at 30%, increase over time)

**Impact:** Zero tests means every change risks silent regressions. The POS payment flow, permission system, and cart logic are especially critical to test.

---

### 3.2 96+ `any` Type Usages Across 33+ Files

- [ ] Fix `any` in service files (43+ occurrences):
  - [ ] `salesOrderService.ts` — type `customer`, `warehouse`, `items` parameters
  - [ ] `ecommerceOrderService.ts` — type all `(o: any)`, `(i: any)` mapping callbacks
  - [ ] `commonService.ts` — type `queryParams` and `tid` parameters
- [ ] Fix `any` in component files:
  - [ ] `datatable.tsx` — type `params: any` properly
  - [ ] `header.tsx` — type `user: any` properly
  - [ ] `sidebar.tsx` — type `icon: any` properly
- [ ] Fix `any` in page files:
  - [ ] `products/page.tsx` — replace `(user as any)?.tenant?.business_type`
  - [ ] `sales-orders/page.tsx` — type `detailItems` and `currentSO`
  - [ ] `pos-sales/page.tsx` — type all untyped state variables
- [ ] Enable ESLint `@typescript-eslint/no-explicit-any` rule (warn first, then error)
- [ ] Replace `ApiResponse<any>` with specific response types per endpoint

**Impact:** `any` defeats TypeScript's purpose. Bugs hide in untyped code — especially in service methods where wrong API response shapes silently pass.

---

### 3.3 Inconsistent State Management (SWR + Manual useEffect)

- [ ] Pick ONE server-state strategy: SWR (already used for auth) or remove SWR and go fully manual
- [ ] **Recommended:** Adopt SWR consistently across all data fetching:
  - [ ] Create `useSWR` wrappers for each service domain (products, orders, etc.)
  - [ ] Replace `useEffect` + `useState` + `setLoading` + `setError` patterns
  - [ ] Gain: automatic caching, deduplication, revalidation, stale-while-revalidate
- [ ] If keeping manual approach: remove SWR dependency to reduce bundle
- [ ] Remove `@tanstack/react-query` (already identified as dead)

**Impact:** Every page currently has ~20 lines of boilerplate for fetching: `const [data, setData] = useState([]); const [loading, setLoading] = useState(true); useEffect(() => { service.list().then(setData).finally(() => setLoading(false)); }, []);`. SWR eliminates this with `const { data, isLoading } = useSWR('key', fetcher)`.

---

### 3.4 No Form Validation Library

- [ ] Install `zod` for schema validation (lightweight, TypeScript-first)
- [ ] Install `react-hook-form` + `@hookform/resolvers` for form state management
- [ ] Migrate critical forms:
  - [ ] Product add/edit form (`products/add/page.tsx`)
  - [ ] Sales order form (`sales-orders/add/page.tsx`)
  - [ ] Purchase order form (`purchase-orders/add/page.tsx`)
  - [ ] POS checkout flow (`pos-sales/page.tsx`)
  - [ ] Customer registration form (`store/account/register/page.tsx`)
  - [ ] Checkout form (`store/checkout/page.tsx`)
- [ ] Replace manual `useState` per field with `useForm()` controller
- [ ] Add client-side field-level validation (required, min/max, email format, etc.)
- [ ] Display inline validation errors below each field (not just server 422 responses)

**Current behavior:** All forms use raw `useState` per field, manual `handleInputChange`, and rely solely on server-side 422 validation. Users must submit, wait for API response, then see errors. No inline validation.

---

### 3.5 No Unsaved Changes Protection

- [ ] Create a `useUnsavedChanges(isDirty: boolean)` hook
- [ ] Add `beforeunload` event listener when form is dirty
- [ ] Intercept Next.js client-side navigation when form is dirty
- [ ] Show confirmation dialog: "You have unsaved changes. Are you sure you want to leave?"
- [ ] Apply to all add/edit forms: products, sales orders, purchase orders, blog posts, static pages, settings

**Impact:** Users can navigate away from a half-filled 20-field product form with zero warning, losing all their work.

---

### 3.6 ESLint Configuration Is Minimal

- [ ] Add `eslint-plugin-jsx-a11y` for accessibility linting
- [ ] Add `eslint-plugin-import` for import ordering and unused imports
- [ ] Enable `@typescript-eslint/no-explicit-any` (warn → error)
- [ ] Enable `@typescript-eslint/no-unused-vars` (error)
- [ ] Consider `eslint-plugin-react-hooks` exhaustive-deps rule enforcement
- [ ] Add `.eslintignore` for generated files

---

### 3.7 No `.env.example` Documentation

- [ ] Expand `.env.example` with all possible environment variables
- [ ] Document optional variables: feature flags, analytics keys, payment gateway credentials
- [ ] Add comments explaining each variable
- [ ] Remove `.env.production` from git tracking (use CI/CD environment injection)
- [ ] Add `.env.production` to `.gitignore`

**Current `.env.example`** has only 4 variables: `NODE_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_URL`.

---

## 4. P3 — UX & Accessibility

### 4.1 Admin Pages — Zero Accessibility

- [ ] Add `aria-label` to all icon-only buttons (edit, delete, view, print)
- [ ] Add `aria-label` to all data tables
- [ ] Add keyboard navigation support to custom dropdowns and selects
- [ ] Add focus trap to all modals (SO detail modal, payment modal, confirmation dialogs)
- [ ] Add focus management on modal open/close (return focus to trigger button)
- [ ] Add `aria-live="polite"` to toast notification container
- [ ] Add skip-to-content link in admin layout
- [ ] Test keyboard-only navigation through all CRUD flows
- [ ] Ensure all form inputs have associated `<label>` elements
- [ ] Audit color contrast ratios (especially in dark mode)
- [ ] Add `role="alert"` to error messages

**Impact:** The admin dashboard is currently inaccessible to screen reader users and keyboard-only users. This may be a legal requirement depending on jurisdiction (ADA, WCAG 2.1 AA).

---

### 4.2 Missing Loading States in Admin

- [ ] Add `loading.tsx` to `app/(protected)/` root
- [ ] Add `loading.tsx` to `app/(protected)/products/`
- [ ] Add `loading.tsx` to `app/(protected)/sales-orders/`
- [ ] Add `loading.tsx` to `app/(protected)/pos-sales/`
- [ ] Add `loading.tsx` to `app/(protected)/purchase-orders/`
- [ ] Add skeleton loading states for data tables instead of simple spinners

**Current behavior:** Only 4 `loading.tsx` files exist (1 global + 3 storefront). The entire admin section shows nothing during route transitions.

---

### 4.3 No Per-Route Error Boundaries

- [ ] Add `error.tsx` to `app/(protected)/` — catches all admin errors with "reload" option
- [ ] Add `error.tsx` to `app/(storefront)/` — catches all storefront errors with store-themed UI
- [ ] Add `error.tsx` to key heavy routes: `/reports/`, `/pos-sales/`, `/ecommerce/`
- [ ] Wrap individual dashboard widgets (charts, KPIs) in `<ErrorBoundary>` components so one widget crash doesn't take down the whole dashboard
- [ ] Log errors to a monitoring service (Sentry, LogRocket, etc.)

**Current behavior:** One global `error.tsx` catches everything. A crashing chart widget takes down the entire page with a generic "Something went wrong" message.

---

### 4.4 POS Module UX Gaps

- [ ] `pos-sales/page.tsx` is ~1000+ lines — split into sub-components (cart panel, product grid, customer selector, payment section)
- [ ] Add offline support for POS (service worker + IndexedDB queue)
- [ ] Add barcode scanner input handling (keyboard wedge mode)
- [ ] Add keyboard shortcuts for common POS actions (F1=new sale, F2=hold, F3=payment, F4=customer)
- [ ] Add sound feedback for successful scan / payment
- [ ] Test on tablet/touchscreen devices

---

## 5. P4 — Storefront Completion (Feature Gaps)

These are features where the frontend page exists but uses mock data, or the backend API is planned but not built.

### 5.1 Checkout Flow (End-to-End)

- [ ] **Backend:** Build `POST /v1/storefront/cart/validate` — verify stock availability, calculate totals
- [ ] **Backend:** Build `POST /v1/storefront/checkout/quote` — compute order total with shipping + tax
- [ ] **Backend:** Build `POST /v1/storefront/checkout/place` — create order, deduct stock, send confirmation
- [ ] **Frontend:** Wire `store/checkout/page.tsx` to real APIs (currently uses mock data)
- [ ] **Frontend:** Implement address selection in checkout
- [ ] **Frontend:** Add payment gateway integration (SSLCommerz / bKash / Stripe)
- [ ] **Frontend:** Build order success page with real order data
- [ ] **Frontend:** Add checkout form validation (shipping address, payment method)
- [ ] **Frontend:** Handle out-of-stock items at checkout time

---

### 5.2 Storefront Search

- [ ] **Backend:** Build `GET /v1/storefront/search` — full-text product search with filters
- [ ] **Backend:** Build `GET /v1/storefront/search/suggest` — autocomplete suggestions
- [ ] **Frontend:** Wire `store/search/page.tsx` to real search API
- [ ] **Frontend:** Wire `SearchBar.tsx` to autocomplete API (currently uses `POPULAR_SEARCHES` mock)
- [ ] **Frontend:** Add search filters (category, brand, price range, sort order)
- [ ] **Frontend:** Add "no results" state with suggestions

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

- [ ] Add `generateMetadata()` to all storefront pages for dynamic SEO
- [ ] Add Open Graph meta tags (title, description, image) for social sharing
- [ ] Add structured data (JSON-LD) for products, reviews, organization
- [ ] Generate `sitemap.xml` dynamically
- [ ] Add `robots.txt` configuration

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

| Metric                              | Count                               |
| ----------------------------------- | ----------------------------------- |
| **P0 Security/Architecture items**  | 5 issues, ~17 tasks                 |
| **P1 Performance items**            | 7 issues, ~20 tasks                 |
| **P2 Code Quality items**           | 7 issues, ~35 tasks                 |
| **P3 UX/Accessibility items**       | 4 issues, ~25 tasks                 |
| **P4 Storefront feature gaps**      | 7 areas, ~35 tasks                  |
| **P5 Ecommerce admin stubs**        | 16 stub pages to build              |
| **P6 Missing report pages**         | 13 report pages to build            |
| **P7 Planned but unbuilt features** | 20+ feature areas                   |
|                                     |                                     |
| **Total ecommerce pages**           | 46 (30 real + 16 stubs)             |
| **Mock data imports**               | 16 production files                 |
| **`any` type usages**               | 96+ across 33+ files                |
| **Test files**                      | 0                                   |
| **Backend APIs without frontend**   | 13 report + 17 storefront endpoints |
| **Dynamic imports**                 | 0                                   |
| **`middleware.ts`**                 | Does not exist                      |
| **Security headers**                | None configured                     |

---

### Recommended Priority Order

1. **P0** — Security headers, middleware.ts, HTML sanitization, remove mock data from production paths, fix DELETE-via-GET
2. **P1** — Dynamic imports, remove dead deps, request cancellation, enable strict mode
3. **P2** — Add testing framework + critical tests, fix `any` types, adopt consistent data fetching, form validation
4. **P3** — Accessibility audit, loading states, error boundaries, POS UX
5. **P4** — Storefront checkout flow, search, reviews, coupons (revenue-critical)
6. **P5/P6** — Stub pages and missing reports (incremental, can be done in sprints)
7. **P7** — Planned features (roadmap items, longer term)
