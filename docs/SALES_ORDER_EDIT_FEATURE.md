# Sales Order Edit Feature — Context

## How It Works
Editing reuses the existing `/sales-orders/add` page.  
The list page routes `router.push('/sales-orders/add?edit=${row.id}')` (line 88 of `page.tsx`).  
The add page detects the `?edit` query param and switches into edit mode.

## New API Endpoint
```
POST /api/v1/sales-order/{id}/update
Auth: sanctum
Body: same payload shape as POST /store (invoice_number is ignored — never regenerated)
Returns: updated SalesOrder with customer, warehouse, items
```

## Files Changed
| File | What Changed |
|------|-------------|
| `inventory-laravel/routes/api.php` | Added `POST /{id}/update` route in `sales-order` group (placed before GET `/{id}`) |
| `inventory-laravel/app/Http/Controllers/Api/SalesOrderController.php` | Added `updateSalesOrder()` method |
| `inventory-laravel/app/Traits/SalesOrderTrait.php` | Added `updateSalesOrder()`, `handleStockTransitionForEdit()`, `$force` param on `applyOrderStockMovements()` |
| `inventory-next/services/salesOrderService.ts` | Added `updateSalesOrder(id, data)` |
| `inventory-next/app/(protected)/sales-orders/add/page.tsx` | Edit mode detection, load effect, locked banner, dynamic title/button, Cancel button |

## Key Business Rules

### 1. Cancelled / Returned Status Lock
- If `order.status` is `cancelled` or `returned`:
  - Frontend: status `<select>` is disabled; amber banner shown
  - Backend: throws 422 if `user_type` is not `super_admin` or `tenant_admin`
- Super admins and tenant admins can always change status

### 2. Super Admin Tenant Pre-selection
- When super admin opens the edit form, `selectedTenant` is pre-populated from `so.tenant_id + so.tenant.business_name`
- Warehouses for that tenant load automatically (existing `formData.tenant_id` effect)

### 3. Stock Movements on Edit
`handleStockTransitionForEdit(so, oldStatus, newStatus, wasConfirmed)`:
- If order **was confirmed** before edit:
  - Reverse existing TYPE_SALE movements via TYPE_ADJUSTMENT counter-rows
  - If new status is still confirmed → re-apply fresh movements with `$force = true`
- If order **was not confirmed**:
  - If new status is confirmed → apply movements normally (no prior movements to conflict)
- `$force = true` on `applyOrderStockMovements` skips the idempotency guard  
  *(needed because after reversal the original TYPE_SALE rows still exist in the table)*

### 4. Delta Payments
On edit, if `new paid_amount > old paid_amount`, a new `Payment` record is created for the **difference only**.  
This avoids double-counting existing payments.

### 5. Invoice Number
Never regenerated on edit. The existing `invoice_number` is always preserved.

### 6. Items
Old items are **deleted and recreated** on every save (clean-slate approach).  
Stock movements are recalculated against the fresh item list.

## Frontend Edit Mode Detection
```typescript
const searchParams = useSearchParams();
const editId = Number(searchParams.get('edit')) || 0;
const isEditMode = editId > 0;
```

## Status Lock Derivation
```typescript
const isLockedForNonAdmin =
  isEditMode &&
  ['returned', 'cancelled'].includes(originalStatus) &&
  !isSuperAdmin &&
  !isTenantAdmin;
```

## Backend Role Check
```php
$isPrivileged = in_array($authUser?->user_type, ['super_admin', 'tenant_admin'], true);
if (in_array($oldStatus, ['cancelled', 'returned'], true) && !$isPrivileged) {
    throw ValidationException::withMessages([
        'status' => ['Only administrators can modify cancelled or returned orders.'],
    ]);
}
```
