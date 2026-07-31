# Frontend Review Plan — Next.js 16 E-Commerce / Inventory UI

## Codebase Profile

| Aspect           | Current State                                           |
| ---------------- | ------------------------------------------------------- |
| **Framework**    | Next.js 16.2.6, React 19.2.6, App Router                |
| **Rendering**    | 100% client components (135+ `'use client'`) — zero SSR |
| **State**        | Zustand (9 stores) + SWR + React Query (mixed)          |
| **Styling**      | Tailwind CSS 4.3.0, custom theme tokens                 |
| **API**          | Axios with CSRF interceptor → Laravel Sanctum           |
| **Auth**         | Cookie-based (Sanctum), client-side route guard only    |
| **Testing**      | None — zero test files, no framework configured         |
| **Bundle**       | No code splitting, no dynamic imports                   |
| **Multi-tenant** | Single-DB, tenant context via Zustand store             |

---

## Priority Tiers

| Tier   | Label    | When to fix                                   |
| ------ | -------- | --------------------------------------------- |
| **P0** | Critical | Before deploy — security holes, data exposure |
| **P1** | High     | Next sprint — performance, reliability        |
| **P2** | Medium   | Planned backlog — maintainability, DX         |
| **P3** | Low      | Nice-to-have — polish, a11y edge cases        |

---

## 1. Linting & TypeScript (P2)

### Checklist

- [ ] **Strict TS** is enabled ✅ — verify no `// @ts-ignore` or `any` abuse. Run: `grep -r "@ts-ignore\|: any" --include="*.ts" --include="*.tsx" | wc -l`
- [ ] **ESLint rules**: Current config is minimal (only `core-web-vitals` + `typescript`). Add:
  - `eslint-plugin-jsx-a11y` — accessibility linting
  - `eslint-plugin-import` — enforce import order and no circular deps
  - `@typescript-eslint/no-explicit-any` — error level
  - `@typescript-eslint/no-unused-vars` — error level
  - `no-console` — warn (remove scattered console.error)
- [ ] Add `lint-staged` + `husky` pre-commit hook to enforce on every commit
- [ ] Verify `types/` directory covers all API response shapes — spot-check 5 service files for missing types
- [ ] Audit for `as` type assertions — prefer type guards or schema validation (zod)

---

## 2. Architecture — Server vs Client Components (P1)

### Checklist

**Critical finding**: ALL 38+ page.tsx files use `'use client'`. This defeats Next.js App Router benefits (streaming, reduced JS bundle, SEO).

- [ ] **Identify SSR candidates** — pages that only fetch-and-display data with no interactivity:
  - Storefront: product listing, product detail, category pages → Server Components + fetch()
  - Dashboard read-only pages: reports, order detail view
  - Static pages: about, terms, privacy
- [ ] **Extract interactive islands**: Keep `'use client'` only on interactive parts (forms, modals, search bars, cart widget). Wrap with Suspense.
- [ ] **Add `middleware.ts`** at project root for server-side route protection — redirect unauthenticated users before page JS loads. Currently auth is client-only (5-second timeout hack).
- [ ] **Server Actions**: Identify form submissions that can use Server Actions instead of client-side fetch (login, contact, newsletter signup).
- [ ] **Metadata**: Pages converted to Server Components can export `generateMetadata()` for SEO — critical for storefront.
- [ ] **Data fetching consolidation**: Currently SWR + React Query + raw axios coexist. Pick one client-side strategy (SWR for simple cache, React Query for complex) and use native `fetch()` in Server Components.

### Migration Priority

1. Storefront pages (SEO + performance) → Server Components
2. Auth pages (simple) → Server Components with client form island
3. Protected dashboard → Keep client but add middleware.ts for guard

---

## 3. Performance — Images, Caching, Bundle (P1)

### Checklist

#### Images (P1)

- [ ] Only 12 files use `next/image` — audit all `<img>` tags and replace with `<Image>` for automatic optimization
- [ ] Verify all `<Image>` components have explicit `width`/`height` or `fill` + `sizes` prop (prevents CLS)
- [ ] Add `priority` prop to above-the-fold hero images
- [ ] Verify `next.config.ts` image domains cover production CDN (currently only localhost + api.musfiz.com)
- [ ] Implement blur placeholder for product images: `placeholder="blur"` with `blurDataURL`

#### Bundle / Code Splitting (P0–P1)

- [ ] **Zero dynamic imports detected** — implement `next/dynamic` for:
  - Rich text editors (Lexical, React Quill) — heavy deps, not needed on page load
  - Chart components (Recharts) — dashboard only
  - PDF/barcode generation (jsPDF, html2canvas, jsbarcode) — on-demand only
  - SweetAlert2 — load on first trigger
  - Date pickers — load on focus
- [ ] Add `@next/bundle-analyzer` to package.json scripts and audit largest chunks
- [ ] Verify no barrel-file re-exports pull entire module trees (check `services/index.ts` re-exporting 57 services)
- [ ] Tree-shake icon libraries: import `lucide-react/icons/X` not `lucide-react`

#### Caching & Revalidation (P2)

- [ ] When SSR is adopted, configure `revalidate` or `cache: 'force-cache'` on fetch calls for storefront catalog
- [ ] SWR/React Query: verify `staleTime` and `dedupingInterval` are configured (not refetching on every mount)
- [ ] Static assets: verify `Cache-Control` headers for `/_next/static/` in deployment config

#### Misc

- [ ] `reactStrictMode: false` in next.config.ts — **re-enable** to catch React bugs in development
- [ ] Audit `useEffect` with missing dependency arrays (common source of infinite re-renders)

---

## 4. State & Data Fetching (P2)

### Checklist

- [ ] **Dual library audit**: Both SWR (^2.4.0) and React Query (^5.101.2) are installed. Pick one to avoid confusion:
  - SWR: simpler, already used in `use-auth.ts`
  - React Query: richer (mutations, prefetching, devtools) — better for complex CRUD
- [ ] **Zustand store review**: 9 stores. Verify:
  - No duplicate state (e.g., user in both `auth-store` and SWR cache)
  - Persistent stores (`persist` middleware) handle SSR hydration mismatch — check for hydration errors
  - Cart store validates stock levels client-side but must re-validate server-side before checkout
- [ ] **Stale closure bugs**: Audit Zustand selectors inside `useEffect` — must use `subscribe` or `getState()` for latest value
- [ ] **Optimistic updates**: Identify mutation-heavy flows (POS, cart) and verify they use optimistic UI with rollback
- [ ] **Loading/error states**: Verify every data-fetching hook exposes `isLoading`, `error` — and consuming components render skeletons (not blank screens)
- [ ] **Pagination**: Verify DataTable component properly resets page on filter change

---

## 5. API Client Safety (P0)

### Checklist

- [ ] **CSRF flow** ✅ — interceptor fetches `/sanctum/csrf-cookie` before mutating requests. Verify:
  - The `isFetchingCSRF` flag prevents race conditions on concurrent requests
  - Retry logic on 419 doesn't loop infinitely (max 1 retry)
- [ ] **Response typing**: Verify all service functions type their responses — no `any` returns. Spot-check: `productService`, `salesOrderService`, `posService`
- [ ] **Error propagation**: 98 try/catch blocks found — verify they don't silently swallow errors. Pattern should be: catch → show toast → optionally rethrow
- [ ] **Request cancellation**: Long-running requests (search, reports) should use `AbortController` to cancel on unmount/re-request
- [ ] **Input sanitization**: Any user input rendered as HTML (rich text editor output) must use DOMPurify or equivalent before `dangerouslySetInnerHTML`
- [ ] **File upload validation**: Verify client-side size/type checks before upload (fail fast, don't wait for server 413)
- [ ] **Rate limiting awareness**: Add client-side debounce on search inputs and auto-save fields (currently unknown)
- [ ] **Sensitive data**: Verify no tokens/secrets logged via `console.error` in catch blocks

---

## 6. Security (P0)

### Checklist

- [ ] **No `middleware.ts`** — **Critical gap**. All route protection is client-side. An attacker can access protected page HTML/JS before the redirect fires.
  - Fix: Add Next.js middleware that checks Sanctum session cookie and redirects to `/login` for protected routes
- [ ] **`.env.production` committed to repo** — verify it contains NO secrets (only `NEXT_PUBLIC_*` vars are safe to commit). If it has server-side secrets, remove and rotate immediately.
- [ ] **XSS surface**: Audit for `dangerouslySetInnerHTML` usage — must sanitize with DOMPurify. Check: rich text editor output rendering, blog posts, product descriptions.
- [ ] **CSRF** ✅ — Sanctum XSRF-TOKEN cookie flow is correctly implemented in axios interceptor
- [ ] **Auth token storage**: Verify no access tokens stored in localStorage (vulnerable to XSS). Current: cookie-based ✅
- [ ] **Clickjacking**: Verify `X-Frame-Options` or CSP `frame-ancestors` header is set (server/reverse proxy concern but verify in next.config.ts headers)
- [ ] **Content Security Policy**: Add CSP headers via `next.config.ts` `headers()` — restrict inline scripts, external sources
- [ ] **Open redirects**: Verify redirect URLs after login (`redirectIfAuthenticated` param) are validated against allowlist, not arbitrary URLs
- [ ] **Permissions enforcement**: `usePermissions` hook is client-only — a determined user can bypass UI restrictions. Ensure the API enforces permissions server-side (backend concern, but verify UI doesn't assume client-side permission check is sufficient).
- [ ] **Super-admin impersonation** (`switchUser`): Verify the switched-user session is properly scoped and logged for audit trail

---

## 7. Testing (P0–P1)

### Checklist

**Critical finding**: Zero test files exist. No testing framework configured.

#### Setup (P0)

- [ ] Install Vitest + React Testing Library + jsdom:
  ```bash
  npm i -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
  ```
- [ ] Add `vitest.config.ts` with path aliases matching tsconfig
- [ ] Add `test` and `test:coverage` scripts to package.json
- [ ] Add CI step to run tests on PR

#### Priority Tests (P1)

- [ ] **Auth flow**: Login, logout, permission redirect, session expiry handling
- [ ] **Cart store**: Add/remove/update quantity, stock validation, persistence
- [ ] **API interceptors**: CSRF retry, 401 redirect, 403 redirect, error propagation
- [ ] **DataTable**: Pagination, sorting, search param sync
- [ ] **POS module**: Sale flow, payment calculation, refund state
- [ ] **Form validation**: Required fields, numeric bounds, file type/size checks

#### E2E (P2)

- [ ] Install Playwright for critical user journeys:
  - Login → browse products → add to cart → checkout
  - POS sale creation → payment → receipt print
  - Admin: create product → upload image → publish

#### Visual Regression (P3)

- [ ] Consider Chromatic or Percy for storefront UI stability

---

## 8. Accessibility (P2–P3)

### Checklist

- [ ] **Current state**: 75 `aria-*` attributes found — mostly on storefront components. Admin dashboard has minimal a11y.
- [ ] **Add eslint-plugin-jsx-a11y** to catch missing alt text, label associations, role usage
- [ ] **Focus management**:
  - Modals must trap focus and return focus on close (check SweetAlert2 modals, custom modals)
  - Drawers/sidebars must trap focus when open
  - After route navigation, focus should move to main content (or page title)
- [ ] **Keyboard navigation**:
  - DataTable: verify rows are navigable via arrow keys or Tab
  - Custom selects (`react-select`): verify keyboard accessible ✅ (library handles this)
  - POS number pad: verify keyboard support
- [ ] **Color contrast**: Verify brand palette meets WCAG 2.1 AA (4.5:1 text, 3:1 UI components) in both light and dark modes
- [ ] **Screen reader audit**: Verify icon-only buttons have `aria-label` (found in storefront; check admin dashboard)
- [ ] **Reduced motion**: Verify animations respect `prefers-reduced-motion` media query
- [ ] **Form errors**: Verify validation errors are announced via `aria-live="polite"` or `aria-describedby`
- [ ] **Landmarks**: Verify pages use semantic HTML (`<main>`, `<nav>`, `<aside>`, `<header>`) — not just `<div>` soup
- [ ] **Skip link**: Add "Skip to main content" link for keyboard users

---

## Execution Order

| Phase                                    | Scope                                                                                           | Tier |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- | ---- |
| **Phase 1 — Security & Reliability**     | §6 middleware.ts + env audit + XSS, §5 API safety, §7 test setup                                | P0   |
| **Phase 2 — Performance**                | §3 dynamic imports + images + bundle analysis, §2 SSR migration (storefront), §7 priority tests | P1   |
| **Phase 3 — Architecture & Consistency** | §2 component boundaries, §4 state consolidation, §1 linting, §8 a11y basics                     | P2   |
| **Phase 4 — Polish**                     | §8 advanced a11y, §7 E2E + visual regression, §3 caching strategies                             | P3   |

---

## Quick Wins (< 1 day each)

1. Add `middleware.ts` for auth route guard (server-side)
2. Enable `reactStrictMode: true`
3. Dynamic import Lexical/Recharts/jsPDF/SweetAlert2
4. Add `@next/bundle-analyzer` and audit
5. Add `eslint-plugin-jsx-a11y` to ESLint config
6. Remove `.env.production` from git tracking if it contains secrets
7. Install Vitest + write first test for auth hook
