# Customer Authentication Implementation Plan

**Context:** The storefront has mock-only customer authentication (fake login/register in Zustand store). The admin/tenant auth system already works via Laravel Sanctum session-based auth. This plan wires up real customer authentication for both the Laravel backend and Next.js frontend, following the identical Sanctum session pattern already in place.

The customer model (`Customer`) already exists in the Laravel backend but:
- Extends `Model` (not `Authenticatable`) — no password auth support
- The customers table recently got `password` and `source` columns via migrations, but still needs `email_verified_at`, `last_login_at`, and `remember_token`
- No `customer` auth guard exists in `config/auth.php`
- No customer auth controller exists
- The storefront routes file already references `auth:customer` middleware (for wishlist) but it will fail at runtime

The frontend has:
- Login page with nice UI but pre-filled demo credentials
- Register page with password strength meter
- Mock auth store (`customer-auth-store.ts`) with fake `setTimeout` delays
- Axios client already configured for Sanctum CSRF + session cookies
- Admin `use-auth.ts` hook as reference pattern

---

## Migration — Add auth columns

**File:** `D:\inventory\inventory-api\database\migrations\2026_07_28_000001_add_auth_fields_to_customers_table.php`

```php
Schema::table('customers', function (Blueprint $table) {
    $table->timestamp('email_verified_at')->nullable()->after('password');
    $table->timestamp('last_login_at')->nullable()->after('email_verified_at');
    $table->rememberToken()->after('last_login_at');
});
```

---

## Customer Model — Extend Authenticatable

**File:** `D:\inventory\inventory-api\app\Models\Customer.php`

- Base class: `Model` → `Illuminate\Foundation\Auth\User` (as `Authenticatable`)
- Add traits: `Notifiable`, `HasApiTokens`
- Add `$hidden`: `['password', 'remember_token']`
- Add casts: `password => 'hashed'`, `email_verified_at => 'datetime'`, `last_login_at => 'datetime'`
- Keep all existing `$fillable`, relationships, and other traits

---

## Auth Guard Config

**File:** `D:\inventory\inventory-api\config\auth.php`

Add to `guards`:
```php
'customer' => [
    'driver' => 'session',
    'provider' => 'customers',
],
```

Add to `providers`:
```php
'customers' => [
    'driver' => 'eloquent',
    'model' => App\Models\Customer::class,
],
```

This makes `Auth::guard('customer')` and `auth:customer` middleware work.

---

## Form Request for Registration

**File:** `D:\inventory\inventory-api\app\Http\Requests\Storefront\RegisterCustomerRequest.php`

- Validate: `name` (required, string, max:255), `email` (required, email, unique:customers,email), `phone` (required, string, max:20), `password` (required, string, min:6, confirmed)

---

## CustomerAuthController

**File:** `D:\inventory\inventory-api\app\Http\Controllers\Api\Storefront\CustomerAuthController.php`

Four methods following the exact pattern from `AuthController.php`:

1. **`register(RegisterCustomerRequest $request)`** — Resolves tenant (via X-Tenant header or first active storefront tenant), creates customer with `source = 'storefront'`, auto-logs in via `Auth::guard('customer')->login()`, returns 201 with customer JSON

2. **`login(Request $request)`** — Validates credentials, `Auth::guard('customer')->attempt()`, checks `status === 'active'`, updates `last_login_at`, regenerates session, returns customer JSON

3. **`logout(Request $request)`** — `Auth::guard('customer')->logout()`, invalidates session, regenerates token, returns 204

4. **`me(Request $request)`** — Returns `Auth::guard('customer')->user()`, 401 if unauthenticated

---

## Storefront Routes

**File:** `D:\inventory\inventory-api\routes\route\storefront.php`

Add auth routes inside `v1/storefront` prefix:
```
POST auth/register  → CustomerAuthController@register  (public)
POST auth/login     → CustomerAuthController@login      (public)
POST auth/logout    → CustomerAuthController@logout     (auth:customer)
GET  auth/me        → CustomerAuthController@me         (auth:customer)
```

Move `wishlist/toggle` inside the `auth:customer` group (it was already protected but the guard was missing).

---

## Update Types (Frontend)

**File:** `D:\inventory\inventory-ui\types\storefront.ts`

Update `CustomerUser` to match backend JSON response:
- `id: number` (not string)
- Add `uuid`, `tenant_id`, `source`, `status`, `type`, `email_verified_at`, `last_login_at`, etc.
- Remove `addresses` from the type (addresses come from separate endpoints)

---

## Rewrite Customer Auth Store

**File:** `D:\inventory\inventory-ui\stores\customer-auth-store.ts`

Replace mock implementation with real API calls using existing `axios` client:
- **`login(email, password)`** — CSRF cookie → `POST /api/v1/storefront/auth/login` → set user + isAuthenticated
- **`register(name, email, phone, password)`** — CSRF cookie → `POST /api/v1/storefront/auth/register` (includes `password_confirmation`) → set user + isAuthenticated
- **`logout()`** — `POST /api/v1/storefront/auth/logout` → clear state
- Remove `persist` middleware (session cookies are the auth persistence mechanism — localStorage would desync)

**New file:** `D:\inventory\inventory-ui\hooks\use-customer-auth.ts`

SWR-based hook matching `use-auth.ts` pattern:
- Fetches `GET /api/v1/storefront/auth/me` via SWR
- `middleware: 'auth'` mode redirects to `/store/account/login` on 401
- `middleware: 'guest'` mode redirects authenticated users away from login/register

---

## Update Login Page

**File:** `D:\inventory\inventory-ui\app\(storefront)\store\account\login\page.tsx`

- Remove demo credentials section (lines 149-162)
- Remove pre-filled demo email/password (set initial state to `''`)
- Add field-level error display from API validation errors (422 responses)

---

## Update Register Page

**File:** `D:\inventory\inventory-ui\app\(storefront)\store\account\register\page.tsx`

- Add error display for API 422 validation errors
- Pass `password_confirmation` field (matching `confirmed` rule on backend)
- Keep password strength meter and confirmation match indicator

---

## Add Auth Guard to Account Layout

**File:** `D:\inventory\inventory-ui\app\(storefront)\store\account\layout.tsx`

- Add `useCustomerAuth({ middleware: 'auth' })` hook on mount
- Show loading skeleton while session validates
- Redirect to `/store/account/login` if not authenticated
- Keep sidebar and user greeting — already reads from updated store

---

## No Changes Needed

- `StorefrontHeader.tsx` — Already reads from auth store, renders correctly for both authed/guest states
- `WishlistController.php` — Already references `auth:customer`, will work once guard exists
- Account dashboard `page.tsx` — Mock orders stay until order API is wired up

---

## Verification

1. **Migration:** `php artisan migrate` — verify new columns appear in customers table
2. **Model:** `php artisan tinker` → `(new Customer()) instanceof Illuminate\Foundation\Auth\User` → `true`
3. **Auth guard:** `php artisan route:list --path=v1/storefront` — verify auth/register, auth/login, auth/logout, auth/me routes appear
4. **Registration:** Submit registration form → check DB for new customer with hashed password → auto-redirected to account dashboard
5. **Login:** Submit login form with correct credentials → redirected to account dashboard with user name displayed
6. **Logout:** Click sign out → redirected to home → attempting to visit `/store/account` redirects to login
7. **Validation:** Submit empty registration → error messages appear inline
8. **TypeScript:** `npx tsc --noEmit` — no type errors

---

## File Summary

| # | File | Action |
|---|------|--------|
| 1 | `inventory-api/database/migrations/..._add_auth_fields_to_customers_table.php` | **Create** — migration |
| 2 | `inventory-api/app/Models/Customer.php` | **Edit** — extend Authenticatable |
| 3 | `inventory-api/config/auth.php` | **Edit** — add customer guard |
| 4 | `inventory-api/app/Http/Requests/Storefront/RegisterCustomerRequest.php` | **Create** — form request |
| 5 | `inventory-api/app/Http/Controllers/Api/Storefront/CustomerAuthController.php` | **Create** — auth controller |
| 6 | `inventory-api/routes/route/storefront.php` | **Edit** — add auth routes |
| 7 | `inventory-ui/types/storefront.ts` | **Edit** — update CustomerUser |
| 8 | `inventory-ui/stores/customer-auth-store.ts` | **Edit** — rewrite with real API |
| 9 | `inventory-ui/hooks/use-customer-auth.ts` | **Create** — SWR hook |
| 10 | `inventory-ui/app/(storefront)/store/account/login/page.tsx` | **Edit** — remove demo, add errors |
| 11 | `inventory-ui/app/(storefront)/store/account/register/page.tsx` | **Edit** — add errors |
| 12 | `inventory-ui/app/(storefront)/store/account/layout.tsx` | **Edit** — add auth guard |