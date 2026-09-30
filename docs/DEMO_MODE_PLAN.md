# Demo Mode Plan — Frontend (inventory-ui)

UI side of the read-only demo deployment with one-click demo login.
Backend counterpart: `inventory-api/docs/DEMO_MODE_PLAN.md`.

## Goals

- Show one-click demo login buttons on the login page when the backend is in demo mode.
- Never show or store demo passwords.
- Gracefully handle blocked write actions (no redirect to access-denied).
- No frontend env flag needed — the backend decides (endpoint returns 404 when demo is off).

## Backend Contract

| Endpoint | Demo on | Demo off |
|---|---|---|
| `GET /api/v1/demo-users` | `200 [{ id, name, email, user_type, tenant: { name } }]` | `404` |
| `POST /api/v1/demo-login` `{ user_id }` | `200` user JSON (session started) | `404` |
| Any blocked write/read | `403 { message, code: "DEMO_MODE" }` | — |

## 1. Types & Service

- `types/demo.ts`: `DemoUser` interface (`id`, `name`, `email`, `user_type`, `tenant?: { name }`).
- `services/demoService.ts`:
  - `getDemoUsers(): Promise<DemoUser[]>` — returns `[]` on 404.
  - `demoLogin(userId: string)` — POST via shared axios instance.

## 2. Auth Hook

File: `hooks/use-auth.ts`

- Add `demoLogin(userId)` mirroring `login`: `csrf()` → `POST /api/v1/demo-login` → `mutate()` → redirect (respecting `?redirect=` param).
- Error handling identical to `login` (set errors / stop loading).

## 3. Login Page

File: `app/(auth)/login/page.tsx`

- On mount, call `getDemoUsers()`.
- If non-empty, render a **"Try the demo"** section below the form:
  - One button per demo user: name, role badge (`user_type`), tenant name.
  - Per-button loading state; disable all buttons while one is logging in.
- If empty/404, render nothing (normal login unchanged).
- Optional: extract into `components/auth/demo-login-panel.tsx` to keep the page lean.

## 4. Axios Interceptor

File: `lib/api/axios.ts`

Current: every `403` redirects to `/access-denied`.

Change:

- If `error.response?.status === 403 && error.response?.data?.code === 'DEMO_MODE'` → push a notice to the demo notice store, **do not redirect**, reject the promise.
- All other 403s keep existing behaviour.

## 5. Demo Notice UI

No toast library exists in the project, so:

- `stores/demo-notice-store.ts` (Zustand): `message`, `show(message)`, `dismiss()`, auto-dismiss after a few seconds.
- `components/ui/demo-notice.tsx`: fixed-position dismissible notice.
- Mount in the protected layout (and storefront layout if customer demo is enabled).

## 6. Demo Banner

- `components/layout/demo-banner.tsx`: slim top banner "Demo mode — changes are disabled".
- Visibility: backend adds `is_demo: true` to `/api/v1/user` response when demo mode is on (preferred), stored in auth store as `isDemo`.
- Mount in the protected layout.

## 7. Optional Polish

- Use `isDemo` from auth store to disable Save/Delete/Import buttons with a tooltip.
- Cosmetic only — backend middleware remains the real enforcement.

## 8. Future: Sanctum Token Auth

When migrating to Bearer tokens, `demoLogin` stores the returned token the same way as normal login. UI components stay unchanged.

## 9. Tests (Vitest)

- [ ] Login page renders demo buttons when `getDemoUsers` returns users.
- [ ] Login page renders no demo section when it returns `[]`.
- [ ] Clicking a demo button calls `demoLogin` with the right `user_id` and shows loading.
- [ ] Interceptor: 403 with `code: DEMO_MODE` shows notice and does not redirect.
- [ ] Interceptor: other 403 still redirects to `/access-denied`.

## 10. Implementation Checklist

- [ ] `types/demo.ts`, `services/demoService.ts`
- [ ] `demoLogin` in `hooks/use-auth.ts`
- [ ] Demo login panel on login page
- [ ] Axios interceptor `DEMO_MODE` handling
- [ ] Demo notice store + component
- [ ] Demo banner (+ `is_demo` in auth store)
- [ ] Optional disabled-button polish
- [ ] Tests

## Open Decisions

1. Storefront customer one-click demo login (`/store/account/login`)?
2. Show banner on storefront too?
