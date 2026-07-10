# Permission System Analysis

## Overview

This document describes the full permission system for the Inventory application — covering the data model, backend enforcement, frontend state management, sidebar filtering, and per-page access control.

---

## 1. Data Model

### `permissions` table

Stores all available permission names (e.g. `view-users`, `create-products`).

| Column      | Type   | Description                         |
| ----------- | ------ | ----------------------------------- |
| `id`        | bigint | Primary key                         |
| `name`      | string | Permission name (e.g. `view-users`) |
| `uuid`      | string | UUID                                |
| `module_id` | bigint | Foreign key to `modules` table      |

### `permission_users` table (pivot)

Links users to their assigned permissions.

| Column          | Type   | Description           |
| --------------- | ------ | --------------------- |
| `id`            | bigint | Primary key           |
| `user_id`       | bigint | FK → `users.id`       |
| `permission_id` | bigint | FK → `permissions.id` |

### `modules` table

Groups permissions into logical modules (e.g. Users, Products, Stock).

---

## 2. Backend — Permission Enforcement

### Gate Definition (`AppServiceProvider`)

```php
// Super admin bypasses all gates
Gate::before(function (User $user, string $ability) {
    if ($user->isSuperAdmin()) {
        return true;
    }
});

// Per-permission gates read from permission_users table
Gate::define($permission->name, function (User $user) use ($permission) {
    return $user->hasPermission($permission->name);
});
```

### `User::hasPermission()` (Model)

```php
public function hasPermission($permission): bool
{
    return $this->permissions()->where('name', $permission)->exists();
}
```

Queries `permission_users` via the `BelongsToMany` relationship.

### Route Middleware

```php
Route::prefix('users')->middleware('permission:view-users')->group(function () {
    Route::get('/', ...);    // requires view-users
    Route::post('/', ...);   // requires view-users (group level)
    ...
});
```

`PermissionMiddleware` uses `Gate::allows($permission)` which invokes the gate definitions above.

### `/api/v1/user` Endpoint — Returns Permissions

```php
public function getUser(): JsonResponse
{
    $user = User::with(['tenant'])->find(Auth::id());

    if ($user->user_type !== 'super_admin') {
        // Reads from permission_users via BelongsToMany
        $user->permissions = $user->getAllPermissions()?->pluck('name') ?? [];
    }

    return response()->json($user);
}
```

For **super admins**: `permissions` field is omitted (not needed — frontend checks `isSuperAdmin` first).  
For **tenant_admin / tenant_user**: `permissions` is a flat array of permission name strings.

### `switchUser` Endpoint — Also Returns Permissions

```php
$permissionData = UserPermissionTrait::getUserPermissions($targetUser->id);
$targetUser->permissions = $permissionData['permissions']; // array of strings
```

Both `/api/v1/user` and `/api/v1/switch-user/:id` return the `permissions` array consistently.

---

## 3. Frontend — State Management

### Zustand Auth Store (`stores/auth-store.ts`)

```
User {
  id, name, email, user_type,
  permissions: string[],   // ← populated from API
  tenant_id, tenant, ...
}
```

- `switchUser(userId)` → calls API → sets `user: response.user` (with permissions) in store
- `switchBack()` → calls API → sets `user: response.user` (super admin, no permissions needed)
- Store is **persisted to localStorage** (Zustand `persist` middleware)
- `hydrated` flag: `false` until localStorage rehydration completes

### SWR Refresh (`hooks/use-auth.ts`)

On every protected page mount, SWR fetches `/api/v1/user`:

```js
const res = await axios.get('/api/v1/user');
setUser(res.data); // updates Zustand store
```

This ensures the store stays in sync with the backend session after page reloads.

### Permission Hook (`hooks/use-permissions.ts`)

```ts
const hasPermission = (permission: string): boolean => {
  if (!hydrated || !user) return false;
  if (isSuperAdmin) return true; // super admin: always true
  return user.permissions?.includes(permission) ?? false;
};

const hasAnyPermission = (permissions: string[]): boolean => {
  if (isSuperAdmin) return true;
  return permissions.some(p => user.permissions?.includes(p) ?? false);
};
```

Key rules:

- Returns `false` while store is not yet hydrated (prevents flash of wrong state)
- Super admin always returns `true`
- All others check the `permissions` array from the store

---

## 4. Sidebar — Navigation Filtering

### Navigation Item Structure

Each item can have:

- `permission: 'view-users'` — require single permission
- `permissions: ['view-user-permission', 'create-user-permission']` — require any of these
- `superAdminOnly: true` — only super admin can see it
- No permission key — visible to everyone

### `filterNavigationRecursive` (Sidebar component)

Runs **before render** to produce a filtered navigation tree:

```
1. If superAdminOnly && !isSuperAdmin  → remove
2. Recursively filter children
3. If children.length === 0:
   - Has permission user doesn't have → remove parent
   - No permission requirement and no children → remove parent
4. If children.length > 0 → keep parent (children are already filtered)
```

Result stored in `filteredNavigation` (memoized on `[hasPermission, hasAnyPermission, isSuperAdmin]`).

### What Each User Type Sees

| Menu Item                                     | Super Admin | tenant_admin (with perms)    | tenant_user (with perms)     |
| --------------------------------------------- | ----------- | ---------------------------- | ---------------------------- |
| Dashboard                                     | ✅          | ✅                           | ✅                           |
| Tenant Management                             | ✅          | ❌                           | ❌                           |
| User Management                               | ✅          | ✅ if `view-users`           | ✅ if `view-users`           |
| All Permissions                               | ✅          | ❌                           | ❌                           |
| User Permissions                              | ✅          | ✅ if `view-user-permission` | ✅ if `view-user-permission` |
| Product Management                            | ✅          | ✅ if `view-products`        | ✅ if `view-products`        |
| Settings (Brands/Units/Categories/Attributes) | ✅          | ❌                           | ❌                           |

---

## 5. Page-Level Access Control

### `/users` page

```ts
useEffect(() => {
  if (!isHydrated) return;
  if (!isSuperAdmin && !hasPermission('view-users')) {
    router.replace('/dashboard');
  }
}, [isHydrated, isSuperAdmin, hasPermission, router]);
```

### `/user-permissions` page

```ts
useEffect(() => {
  if (!isHydrated) return;
  if (!isSuperAdmin && !hasPermission('view-user-permission')) {
    router.replace('/dashboard');
  }
}, [isHydrated, isSuperAdmin, hasPermission, router]);
```

---

## 6. Action Button Gating

### Users List (`/users`)

| Button             | Condition                                         |
| ------------------ | ------------------------------------------------- |
| **Add User**       | `isSuperAdmin \|\| hasPermission('create-users')` |
| **Edit**           | `isSuperAdmin \|\| hasPermission('update-users')` |
| **Switch to User** | `isSuperAdmin` only                               |
| **Delete**         | `isSuperAdmin \|\| hasPermission('delete-users')` |

Note: Delete is not available for `super_admin` users regardless of permission.

### User Permissions (`/user-permissions`)

| Element                     | Condition                                                   |
| --------------------------- | ----------------------------------------------------------- |
| **Save Permissions** button | `isSuperAdmin \|\| hasPermission('create-user-permission')` |
| **User selector**           | tenant_admin cannot select other tenant_admins              |

---

## 7. User Switch Flow

```
Super Admin → clicks "Switch to User X"
    ↓
POST /api/v1/switch-user/:id
    → Backend: Auth::guard('web')->login($targetUser)
    → Backend: loads permissions from permission_users
    → Returns: { user: { ...targetUser, permissions: [...] }, switched_from: {...} }
    ↓
auth-store.switchUser() sets user in Zustand (persisted to localStorage)
    ↓
window.location.href = '/dashboard'  (full page reload)
    ↓
Zustand rehydrates from localStorage → user has permissions
SWR fetches /api/v1/user → confirms permissions from backend session
    ↓
Sidebar renders with filtered navigation based on user.permissions
Pages redirect if user lacks required permission
```

---

## 8. Registered Permission Names (Examples)

These are used in sidebar `permission:` keys and in `permission_users`:

| Permission                | Used in                                                 |
| ------------------------- | ------------------------------------------------------- |
| `view-users`              | User Management sidebar, /users route middleware        |
| `create-users`            | Add User button                                         |
| `update-users`            | Edit User button                                        |
| `delete-users`            | Delete User button                                      |
| `view-user-permission`    | Permission Management sidebar, /user-permissions access |
| `create-user-permission`  | Save Permissions button                                 |
| `view-products`           | Product Management sidebar                              |
| `create-products`         | Add Product button                                      |
| `view-product-variations` | Product Variations menu                                 |
| `view-stocks`             | Stock Management sidebar                                |
| `view-purchases`          | Purchase Management sidebar                             |
| `view-suppliers`          | Supplier list                                           |
| `view-sales`              | Sales Management sidebar                                |
| `view-customer`           | Customer list                                           |
| `view-pos-sales`          | POS Management sidebar                                  |
| `view-purchase-reports`   | Report Management sidebar                               |

---

## 9. Tenant-Based Data Filtering (Reports & Accounting)

All accounting management pages (Chart of Accounts, Journal Entries, Expenses) and all report pages (45+ pages across Inventory, Sales, Purchase, POS, Customer, Supplier, Product, Warehouse, Tax, System, and Accounting modules) implement tenant-based data filtering using the following pattern:

### Frontend Pattern

Every page follows these steps:

1. **Import dependencies:**
   ```typescript
   import TenantSelect from '@/components/ui/tenant-select';
   import { usePermissions } from '@/hooks/use-permissions';
   import { useAuthStore } from '@/stores/auth-store';
   ```

2. **Get user context:**
   ```typescript
   const { isSuperAdmin } = usePermissions();
   const authUser = useAuthStore(s => s.user);
   const [selectedTenantId, setSelectedTenantId] = useState<string>('');
   ```

3. **Build API params:**
   ```typescript
   const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
   if (tenantId) params.tenant_id = tenantId;
   ```

4. **Show TenantSelect (super admin only):**
   ```tsx
   {isSuperAdmin && (
     <TenantSelect
       value={selectedTenantId}
       onChange={(tid) => setSelectedTenantId(tid || '')}
       placeholder="All Tenants"
     />
   )}
   ```

### Service Layer

All methods in `accountService.ts` and `reportService.ts` accept an optional `tenant_id?: string` parameter. If provided, it is forwarded to the backend API. If omitted, the backend uses the authenticated user's tenant context.

### Behavior by User Type

| User Type | Tenant Selector | Data Scope |
|-----------|----------------|------------|
| **Super Admin** | Visible — can select any tenant | Shows data for selected tenant, or all tenants when empty |
| **Tenant Admin** | Hidden | Automatically scoped to own tenant via `authUser.tenant_id` |
| **Tenant User** | Hidden | Automatically scoped to own tenant via `authUser.tenant_id` |

---

## 10. Key Notes

- **Super admin** (`user_type = 'super_admin'`) bypasses ALL permission checks — both backend (Gate::before) and frontend (`isSuperAdmin` check).
- **`permission_users` is the source of truth** for non-super-admin permissions. It's read on every `/api/v1/user` call and on every `switchUser` call.
- The User model has `'permissions' => 'array'` in `$casts`, but the `permissions` column does NOT exist in the `users` table — it is a **dynamically set attribute** populated from `permission_users` before serialization.
- Sidebar items with `superAdminOnly: true` are invisible to all non-super-admin users regardless of any permissions they hold.
- `Settings` group (Brands, Units, Categories, Attributes) is all `superAdminOnly` — hidden for all tenant users.
- **Report permissions** (e.g. `view-stock-valuation-report`, `view-sales-by-product-report`, etc.) are documented in `REPORT_GENERATION_PLAN.md` §8.1. They follow the same enforcement pattern.
- **Accounting management pages** (Chart of Accounts, Journal Entries, Expenses) do NOT require report permissions — they use the same frontend permission as the sidebar item.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Added §9: Tenant-Based Data Filtering (Reports & Accounting) |
| 2026-07-10 | Added changelog section |
