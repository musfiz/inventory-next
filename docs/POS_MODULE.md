# POS Module — Implementation Reference

**Last updated:** 2026-06-04
**Scope:** All point-of-sale flows in `inventory-next` — register setup, shift sessions, the till (POS sales), order history, refunds, and the related shared components. This document is the **single source of truth** for the POS + sales-return module: implementation, P0 audit, and the working backlog (P1/P2/P3/PO/backend).
**Sibling docs (planned):** `SALES_MODULE.md` (sales-return flow) — to be written.

---

## 1. Module map

The POS module spans **5 pages**, **4 services**, **2 shared components**, and **1 credit-note template**. Everything is gated by per-action permissions from `usePermissions()`.

| Area | Page | Service(s) | Purpose |
|---|---|---|---|
| Registers | `app/(protected)/pos-registers/page.tsx` | `posRegisterService` | CRUD on physical registers (`name`, `code`, `is_active`) per tenant. |
| Sessions (shifts) | `app/(protected)/pos-session/page.tsx` | `posSessionService` | Open / close a till shift. Tracks opening/closing cash, totals by method, counts of sales/refunds. The `pos-sales` page redirects here if there is no active session. |
| Till (sales entry) | `app/(protected)/pos-sales/page.tsx` | `posService`, `posRefundService` (for refund-from-till) | The main cashier screen: scan / pick items, hold / resume orders, checkout, pay. |
| Order history | `app/(protected)/pos-orders/page.tsx` | `posService` (`list` / `show`) | Read-only list of past POS orders with detail drawer. |
| Refunds | `app/(protected)/pos-refunds/page.tsx` | `posRefundService` | List, create, approve+restock, complete, settle payment, cancel, delete. |

| Shared component | File | Used by |
|---|---|---|
| `PaymentModal` | `components/pos/PaymentModal.tsx` | `pos-sales` |
| `HeldOrdersDialog` | `components/pos/HeldOrdersDialog.tsx` | `pos-sales` |
| `PosRefundCreditNote` | `components/invoices/CreditNote.tsx` | `pos-refunds` |
| `SalesReturnCreditNote` | `components/invoices/CreditNote.tsx` | `sales-returns` (same file, sibling export) |

---

## 2. Permission model

All five pages use the project's `usePermissions()` hook. Reads are gated by `view-*`; mutating actions rely on backend enforcement (see P3-1 below — UI does not yet check per-action scopes).

| Page | Read gate | Notes |
|---|---|---|
| `pos-registers` | `view-pos-register` | super-admin can see all tenants. |
| `pos-session` | `view-pos-session` | also requires a register to be active. |
| `pos-sales` | `view-pos` (implicit — enforced via redirect to `pos-session`) | redirects to `/pos-session` if no open session. |
| `pos-orders` | `view-pos-order` | |
| `pos-refunds` | `view-pos-refund` | |

Tenant scoping: super-admin sees a `TenantSelect`; everyone else is pinned to `authUser.tenant_id`.

---

## 3. Register management (`pos-registers`)

586-line page, single DataTable. Columns: `name`, `code`, `is_active` (toggle), `created_at`. The dialog form is minimal — name + code + active. The list endpoint supports `tenant_id` and `is_active` filters.

**Open issue:** see `P3-1` — the toggle and edit/delete buttons should also be gated by `edit-pos-register` / `delete-pos-register` (currently the backend is the only gate).

---

## 4. Sessions / shifts (`pos-session`)

996-line page. Models one shift per user per register. Lifecycle:

```
open:   start_time + opening_balance
close:  end_time + actual_cash → closing_balance
        computes variance = actual - expected, persists counts and totals
```

The session page is also the screen that surfaces **refund counts** and **cash-sales / card-sales / bKash / Nagad / Rocket / bank-transfer** totals broken out by payment method. These are the numbers shown in the `pos-refunds` and `pos-orders` pages indirectly (those pages consume the per-order totals; the session page rolls them up).

**Active session** is the gate for the till: `pos-sales` reads it on mount and redirects if absent.

---

## 5. The till (`pos-sales`) — main cashier screen

1427-line page. The most complex flow in the module.

### 5.1 State and refs

- `cart`: array of `{ variation_id, product, variation, quantity, unit_price, discount, tax_rate }`.
- `selectedCustomer`: optional, supports walk-in (no customer).
- `discount`: `{ type: 'percentage' | 'fixed', value: number }` applied at the cart level.
- `heldOrders`: open holds for the current session.
- `showPaymentModal`, `showHeldOrdersDialog`, `showRefundDialog` (the last is a thin wrapper that jumps to the refund flow when the cashier needs to refund a previously-completed sale).

### 5.2 Sub-flows

1. **Scan / search items** — barcode input or product search; each hit appends a cart line or increments its qty.
2. **Hold / resume** — `posService.holdOrder({ session_id, register_id, cart, customer })` → `HeldOrdersDialog` lists holds; restoring re-hydrates the cart.
3. **Checkout** — opens `PaymentModal`. On confirm, posts `posService.create(payload)` with all `PosPaymentFields` and the cart. On 2xx, prints a receipt and clears the cart.
4. **Refund-from-till** — same dialog pattern as `pos-refunds` but pre-fills from the original order; submits via `posRefundService.quickCreate`.

### 5.3 PaymentModal contract

`components/pos/PaymentModal.tsx` accepts:

```ts
{
  open: boolean;
  cart: CartLine[];
  discount: { type, value };
  customer: { id, name, phone } | null;
  registerId, sessionId, tenantId;
  onClose(): void;
  onSuccess(order: PosOrderResponse): void;
}
```

It renders one row per payment method (`cash`, `card`, `bKash`, `Nagad`, `Rocket`, `bank_transfer`, `store_credit`, `credit`), validates that the sum of tendered amounts ≥ grand total, and posts a single `posService.create` call with the full payment breakdown.

### 5.4 Known gaps

- The cart-side `discount` value is not surfaced in the `PaymentModal`'s summary card (a polish item).
- `pos-sales` does not implement the **P0-1 approve+complete race fix** — that only applies to the explicit refund flow. Refunds initiated from the till are routed through the same `posRefundService` path, so they inherit the fix.
- The `PaymentModal` lacks focus management and `aria-label`s on icon-only buttons (P3-2 / P3-3).

---

## 6. Order history (`pos-orders`)

708-line page. Read-only DataTable + side-drawer for detail. Columns: `invoice_number`, `order_number`, `customer`, `grand_total`, `paid_amount`, `returned_amount`, `payment_status`, `created_at`. The drawer shows the items table, the payment breakdown, and (if applicable) a "Refund" button that deep-links into the refund flow with `pos_order_id` pre-filled.

---

## 7. Refunds (`pos-refunds`) — the focus of recent work

1078-line page. Implements the full refund lifecycle with the P0 fixes that have landed.

### 7.1 Service contract

`posRefundService` exposes:

```ts
list(params)                    // GET /api/v1/pos/refunds
show(id)                        // GET /api/v1/pos/refunds/{id}
store(data)                     // POST /api/v1/pos/refunds/store      (upsert: pass {id,...} to update)
approve(id)                     // POST /api/v1/pos/refunds/{id}/approve
complete(id)                    // POST /api/v1/pos/refunds/{id}/complete
cancel(id)                      // POST /api/v1/pos/refunds/{id}/cancel
destroy(id)                     // GET  /api/v1/pos/refunds/delete/{id}
approveAndComplete(id)          // POST /api/v1/pos/refunds/{id}/approve-and-complete   (P0-1)
settlePayment(id, data)         // POST /api/v1/pos/refunds/{id}/settle-payment
quickCreate(data)               // POST /api/v1/pos/refunds/quick-create               (one-step create with items)
getOrderItems(orderId, opts?)   // GET  /api/v1/pos/orders/{id}/items                  (P0-6: opts.includeCurrentRefunds)
```

There is **no separate `update()` method** — `store()` is an upsert that respects `data.id` (P0-2 resolution).

### 7.2 Lifecycle

```
draft (UI) ──quickCreate──▶ pending ──approve + complete (one tx)──▶ completed ──settlePayment──▶ balanced
                                  │                                          │
                                  ├─cancel──▶ cancelled                       └─over/under-payment──▶ settle dialog
                                  └─destroy (only while pending)──▶ (gone)
```

POS refunds are typically single-step (`approve+complete` together, see §7.4) because the till is the source of truth for stock — there is no separate approval party. The split is retained for cases where the backend approval transitions are different (e.g. partial restock).

### 7.3 Form

- **Tenant**: shown only for super-admin; pinned otherwise.
- **POS order**: `CustomSelect` backed by `loadOrderOptions` which calls `GET /api/v1/pos/orders`. The order select has a **manual refresh button** (P0-6) that re-fetches the order's items with `?include=current_refunds` so the cashier can re-snapshot before submitting.
- **Reason**: 7-option dropdown (`return`, `damaged`, `wrong_item`, `customer_dissatisfaction`, `expired`, `exchange`, `other`).
- **Method**: 8-option dropdown (cash / card / bKash / Nagad / Rocket / bank_transfer / store_credit / exchange).
- **Reason details**: free text.
- **Items**: per-line `quantity` + `unit_price`, auto-populated from the order with `max_returnable` as the default qty. Inputs are bounded `min=0 max=max_returnable`.
- **In-flight banner** (P0-6): when the server reports `current_pending_refunds > 0` on any line, an amber warning shows above the table; a `notify.info` toast also fires on first selection.
- **Caution banner** (always): "The items shown on this page will be refunded once you submit…"
- **Submit**: `posRefundService.quickCreate(...)`. On 4xx, `isReturnableRace(err)` decides between P0-6 recovery and the generic `handleError` path.

### 7.4 Approve + complete (P0-1)

`handleApprove(refund)` tries the combined endpoint first:

```ts
try {
  await posRefundService.approveAndComplete(refund.id);
} catch (combinedErr) {
  if (status !== 404 && status !== 405) throw combinedErr;   // unexpected
  await runSequentialApproveAndComplete(refund.id);
}
```

The **sequential fallback** (`runSequentialApproveAndComplete`) runs `approve()` then `complete()`. If `complete()` throws, it re-throws a `PARTIAL_APPROVE` error so the caller can show a non-green warning.

`handleApproveFailure` and `handleRetryComplete` together provide the recovery UX: a row in `approved` state exposes a "Retry stock restoration" action that calls `complete()` again. No silent success, ever.

### 7.5 Race recovery (P0-6)

When two cashiers act on the same order:

1. Cashier A loads items, sees `max_returnable = 5`, picks qty 5.
2. Cashier B loads the same order, also sees `max_returnable = 5`, picks qty 5.
3. A submits first → server records refund, `max_returnable` for B is now 0.
4. B submits → server rejects with `"This item is no longer fully returnable"`.

Without the fix, B sees a generic 422. With it:

- The page calls `isReturnableRace(err)`, which matches on `"no longer returnable"`, `"not returnable"`, `"exceeds max"`, or a structured `errors.*.max_returnable` field.
- `handleReturnableRace(err)` re-fetches the order items with `?include=current_refunds`, **re-clamps** each existing line to the new `max_returnable` (preserving B's typed qty up to the new cap), and **drops** any line whose `max_returnable` is now 0.
- The server's message is surfaced verbatim via `notify.warning`.

The **in-flight banner** + **manual refresh button** give cashiers a way to recover *before* they submit, not just after.

### 7.6 Settle payment (P0-4, P0-5)

`openSettle(refund)`:
1. Opens the dialog immediately with a loading state.
2. Calls `posRefundService.show(refund.id)` to get a fresh `pos_order` snapshot.
3. Computes `balance = max(0, grand_total - returned_amount) - paid_amount`. If `balance > 0` the action defaults to `collect`; if `balance < 0` to `refund`.
4. Pre-fills `amount` to `Math.abs(balance).toFixed(2)`.

The form caps client-side: `max={Math.abs(balance)}` on the amount input, helper text "Max: ৳X", submit disabled when out-of-range. On submit, `posRefundService.settlePayment` is called.

### 7.7 Cancel

`cancel` is exposed for `pending` and `approved` rows (button shows for either). The confirm prompt is currently a single SweetAlert — **P0-3 is not yet implemented** (see §10).

---

## 8. Shared components

### 8.1 `PaymentModal`

- Props: see §5.3.
- Internal state: one row per payment method, with `tendered` amount and `reference` (for non-cash).
- Validation: sum of `tendered` ≥ `grand_total - discount`. Over-tender change is computed and shown.
- On success: calls `onSuccess(order)`, the parent clears the cart and prints a receipt.

### 8.2 `HeldOrdersDialog`

- Loads holds via `posService.listHeld(sessionId, registerId)`.
- Each row shows `hold_number`, `customer_name`, `total`, `held_at`. Buttons: **Restore** (re-hydrates the parent's cart) and **Delete** (calls `posService.deleteHold`).
- Empties are guarded: a hold with no items cannot be restored.

### 8.3 `PosRefundCreditNote` / `SalesReturnCreditNote`

`components/invoices/CreditNote.tsx` exports two templates that share the same row component but differ in headers, totals, and field names. Both are print-targeted (the parent opens a new window, writes the rendered HTML, and calls `win.print(); win.close()`).

Known minor issues (P2-A #2.10, #2.11, #2.12):
- Missing `item_name` falls back to `-` instead of `product?.name`.
- `formatQty` renders `0.00` for a zero quantity.
- "Subtotal" and "Refund Total" rows are often the same value.

---

## 9. Cross-cutting concerns

### 9.1 Notifications
Both pages use the project's `notify` helper from `lib/notifications.ts`. Methods used: `success`, `error`, `warning`, `info` (imported directly), `confirm`.

### 9.2 Error handling
- `handleError(err)` in `pos-refunds` flattens a Laravel validation payload (`{ errors: { items.0.qty: ['…'] } }`) into a flat `Record<string, string>` for the form, or shows a toast for non-field errors.
- `isReturnableRace(err)` (P0-6) sits in front of `handleError` for the submit path.

### 9.3 Refresh strategy
`refreshKey` is incremented on every successful action to force `useEffect`-driven re-fetches. This is cheap now and will be replaced by per-row mutation (P1-5) when the SWR/react-query migration happens.

### 9.4 Type hygiene
- `PosOrderItemForRefund` and `PosRefundItem` live in `types/api.types.ts`.
- `PosRefund` interface lives in `services/posRefundService.ts` (closer to its consumer than `types/`).
- `PosOrderPayload`, `PosOrderResponse`, `PosHoldPayload` live in `services/posService.ts`.

---

## 10. Resolution status — P0 audit

The original 6 P0 hotfixes from the review are tracked below. Five are landed; **P0-3 is the only remaining P0**.

| ID | Title | Status | Where |
|---|---|---|---|
| **P0-1** | Approve+Complete race | ✅ Resolved | `posRefundService.approveAndComplete()` + 404/405 fallback to `runSequentialApproveAndComplete` + `handleRetryComplete` row action |
| **P0-2** | Dead `update()` method | ✅ Resolved | Both services expose `store()` only; `id` in payload is the upsert signal |
| **P0-3** | Cancel of `approved` return with single prompt | ❌ **OPEN** | See §13.2 |
| **P0-4** | `openSettle` uses stale list payload | ✅ Resolved | `openSettle` calls `posRefundService.show()` first |
| **P0-5** | No client-side cap on settlement amount | ✅ Resolved | `max={Math.abs(balance)}` + helper text + disabled submit |
| **P0-6** | No server-snapshot of concurrent refunds | ✅ Resolved | `?include=current_refunds` + `isReturnableRace` + in-flight banner + manual refresh |
| **P0-backend-question** | Combined `approve-and-complete` endpoint | ⏳ Awaiting backend | See §13.1 — client falls back gracefully; the backend spec is the source of truth |

The detailed P1/P2/P3/PO/backlog items follow in **§13. Open backlog**.

---

## 11. Files at a glance

| Path | LoC | Role |
|---|---:|---|
| `app/(protected)/pos-orders/page.tsx` | 708 | Order history + detail drawer |
| `app/(protected)/pos-refunds/page.tsx` | 1078 | Refund list + form + settle dialog + P0 fixes |
| `app/(protected)/pos-registers/page.tsx` | 586 | Register CRUD |
| `app/(protected)/pos-sales/page.tsx` | 1427 | Till — scan, hold, checkout, refund-from-till |
| `app/(protected)/pos-session/page.tsx` | 996 | Shift open/close, per-method totals |
| `components/pos/PaymentModal.tsx` | – | Multi-method payment capture |
| `components/pos/HeldOrdersDialog.tsx` | – | Hold / resume held orders |
| `components/invoices/CreditNote.tsx` | – | `PosRefundCreditNote` + `SalesReturnCreditNote` |
| `services/posRefundService.ts` | 129 | Refund API client (P0-1, P0-2, P0-6 fixes) |
| `services/posService.ts` | 154 | Order create / list / show / hold / refund-from-till |
| `services/posSessionService.ts` | 81 | Session open/close + totals |
| `services/posRegisterService.ts` | 38 | Register CRUD |
| `types/api.types.ts` | – | `PosOrderItemForRefund`, `PosRefundItem`, `PosHeldOrder`, `PosHoldPayload`, `PosPaymentFields`, `PosOrderDetail`, `PosOrderListItem` |

---

## 12. Verification checklist (post-fix smoke test)

1. **P0-1**: open a refund → click "Approve & Restock" → green success, row goes `pending` → `completed` in one round-trip; force a 404 on the combined endpoint → fallback path runs without crashing.
2. **P0-2**: `grep -RE "\.update\(" app/ services/` returns no hits on refund/return code paths.
3. **P0-3**: open a `completed` return → no Cancel button. Open a `pending` or `approved` return → Cancel shows a stronger prompt. *(still open — see §10)*
4. **P0-4**: settle a partial refund, then re-open the same row → the dialog shows the post-settle balance, not the pre-settle one.
5. **P0-5**: settle dialog with balance 100 → type 999 → submit is disabled, helper text shows "Max: ৳100.00".
6. **P0-6**: open two tabs on the same order. Tab A submits first. Tab B submits second → no 500, a warning fires, the qty inputs are re-clamped to the new `max_returnable`, and the form remains usable.

---

# PART II — Open backlog

The remainder of this document is the working backlog for the POS + sales-return module. It is the **single source of truth** for unfinished work. Each subsection preserves the original issue numbering (P0-1, P1-1, P2-A #2.10, etc.) so that git history and any pasted-in Slack/GitHub links still resolve.

**Tier legend**
- **P0** — release-blocker (money or stock correctness)
- **P1** — high priority, refactor / consolidation
- **P2** — medium priority, UX + type hygiene
- **P3** — low priority, security / permissions / a11y
- **PO** — product-owner decision needed
- **Backend** — owned by the Laravel repo, not `inventory-next`

---

## 13. Open backlog

### 13.1 Backend — combined `approve-and-complete` endpoint

**Audience:** Backend team (Laravel). This is a spec for a separate repo, not a patch.
**Source:** P0-1 (see §10) — the question to the backend team.
**Frontend status:** shipped, falls back to sequential `approve()` + `complete()` with partial-failure recovery on 404/405. Safe to ship the backend change independently.

#### 13.1.1 Why

Today the client calls two endpoints in sequence with no transaction:

```ts
await posRefundService.approve(refund.id);
await posRefundService.complete(refund.id);
```

If `approve` succeeds and `complete` fails (network blip, server crash, validation error), the refund is left in `approved` state with stock not restored. The client now ships a defense-in-depth recovery path; the proper fix is a single backend endpoint that runs both transitions in one DB transaction.

#### 13.1.2 Endpoint

```
POST /api/v1/pos/refunds/{id}/approve-and-complete
```

- **Auth:** same as existing `/approve` and `/complete` — Sanctum cookie auth, scoped by the user's tenant.
- **Permission:** requires `approve-pos-refund` **and** `complete-pos-refund` (both, not either). The client hides the button when either is missing; backend must enforce.
- **Idempotency:** if the refund is already `completed`, return `200` with the current row, **do not** re-run side effects.
- **Audit:** write one row to the refund audit log covering both transitions.

#### 13.1.3 Request

**Path params**

| Name | Type | Notes |
|---|---|---|
| `id` | int \| string | Refund id (matches the `id` in existing routes) |

**Body (optional, JSON)**

```json
{ "notes": "Approved and restocked by manager" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `notes` | string | no | Free text recorded on the audit log entry. No business effect. |

#### 13.1.4 Response

`200 OK` on success or already-completed (idempotent):

```json
{
  "data": {
    "id": 17,
    "refund_number": "REF-2026-00017",
    "status": "completed",
    "approved_by": 4,
    "approved_at": "2026-06-04T10:21:33Z",
    "completed_at": "2026-06-04T10:21:33Z",
    "items": [],
    "pos_order": { "id": 88, "paid_amount": 0, "returned_amount": 1250.00, "payment_status": "refunded" },
    "settlement_payments": []
  }
}
```

- `403 Forbidden` if the user lacks `approve-pos-refund` or `complete-pos-refund`.
- `404 Not Found` if the refund does not exist or belongs to a different tenant.
- `409 Conflict` if the refund is in `cancelled` / `rejected` / `approved` state (terminal or partial — see state machine).
- `422 Unprocessable Entity` for body validation failures (e.g., `notes` longer than 1000 chars).
- `500 Internal Server Error` for any unhandled exception. The transaction must roll back, leaving the row in its prior state.

#### 13.1.5 State machine

```
pending ──approve──▶ approved ──complete──▶ completed
   │                     │                       │
   │                     │                       └─ (terminal, idempotent)
   │
   └─cancel/reject──▶ cancelled | rejected      (terminal)
```

The combined endpoint accepts only `pending` rows. Any other status returns `409` (or `200` if already `completed`). It must not silently re-approve an `approved` row that the client expects to be in `pending` — that is a partial-failure recovery case and must surface clearly so the operator can call `/complete` directly.

#### 13.1.6 Transactional contract

Wrap the entire handler in `DB::transaction(...)`. Inside the transaction:

1. Lock the row: `PosRefund::lockForUpdate()->findOrFail($id)`.
2. Idempotency check. If `status === 'completed'`, commit (no-op) and return `200` with the current row.
3. Run the existing `approve()` service method.
4. Run the existing `complete()` service method (this restores stock).
5. Write a single audit log entry covering both transitions with fields: `refund_id, action = 'approve_and_complete', actor_id, notes, before = {status: 'pending'}, after = {status: 'completed'}, occurred_at`.
6. Commit.

If any step throws, the transaction rolls back, the row remains in `pending`, and the client sees a `5xx` which it surfaces as a generic error and lets the user retry.

#### 13.1.7 Suggested implementation (Laravel)

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'tenant.scope'])
    ->prefix('v1/pos/refunds')
    ->group(function () {
        Route::post('{id}/approve-and-complete', [PosRefundController::class, 'approveAndComplete']);
    });
```

```php
public function approveAndComplete(Request $request, $id): JsonResponse
{
    $data = $request->validate([
        'notes' => ['nullable', 'string', 'max:1000'],
    ]);

    $refund = DB::transaction(function () use ($id, $data) {
        $refund = PosRefund::lockForUpdate()->findOrFail($id);

        if ($refund->status === 'completed') {
            return $refund; // idempotent
        }
        if (in_array($refund->status, ['cancelled', 'rejected'], true)) {
            throw new HttpResponseException(response()->json([
                'message' => "Refund is in terminal state '{$refund->status}' and cannot be approved.",
            ], 409));
        }
        if ($refund->status !== 'pending') {
            throw new HttpResponseException(response()->json([
                'message' => "Refund is in 'approved' state. Use /complete or retry the combined endpoint after the prior transaction finished.",
            ], 409));
        }

        $before = ['status' => $refund->status];

        $this->approvalService->approve($refund);
        $this->refundService->complete($refund, $data);

        $refund->refresh();
        $this->auditLog->record('pos_refund', $refund->id, 'approve_and_complete', [
            'actor_id' => $request->user()->id,
            'notes'    => $data['notes'] ?? null,
            'before'   => $before,
            'after'    => ['status' => 'completed'],
        ]);

        return $refund;
    });

    return response()->json(['data' => new PosRefundResource($refund)]);
}
```

(Adapt names to whatever the existing codebase already uses — `approvalService`, `refundService`, `auditLog` are placeholders.)

#### 13.1.8 Out of scope (explicit)

- No new permission name. The endpoint reuses `approve-pos-refund` + `complete-pos-refund`. If the product wants a single combined permission, say so.
- No body fields beyond `notes`.
- No webhook changes.
- No breaking changes to existing endpoints. `/approve` and `/complete` keep working for two-step approval flows.

#### 13.1.9 Frontend behavior after this ships

The client already detects 404/405 and falls back. Once this endpoint exists and returns 200, the client will use it automatically — no frontend change required. The fallback path stays in the codebase as defense-in-depth.

#### 13.1.10 Test plan (backend)

1. Happy path: `pending` row → 200, status flips to `completed`, stock restored, audit log has one row.
2. Idempotency: hit the endpoint twice on a `completed` row → both return 200, no double stock credit, no extra audit rows.
3. Concurrent: two simultaneous requests on the same `pending` row → one returns 200, the other returns 200 with the same final state. No double stock credit.
4. `cancelled` / `rejected` row → 409, no side effects.
5. `approved` row (prior partial failure from the old flow) → 409 with a clear message. Operator must call `/complete` directly to recover.
6. Tenant boundary: user from tenant A hitting a refund from tenant B → 404.
7. Permission: user with `view-pos-refund` only → 403.
8. `notes` longer than 1000 chars → 422.
9. Forced exception during stock restore → transaction rolls back, row stays `pending`, no audit row written.

#### 13.1.11 Rollout

1. Land the route + controller in a feature branch.
2. Run the test plan above.
3. Deploy backend.
4. Frontend will pick up the new endpoint automatically; no coordination window needed.
5. Keep `/approve` and `/complete` for now; deprecate them in a later release if product confirms two-step is no longer needed.

---

### 13.2 P0-3 — Cancel of `approved` return with single prompt

**File:** `app/(protected)/sales-returns/page.tsx:611-615` (button) and the matching `handleCancelReturn` at line 396
**Risk:** Approval may have posted journal entries / reserved stock reversal. Generic prompt under-warns the user.

**Acceptance:**

- If the backend has a separate `reject` verb, route to that.
- Otherwise, the prompt text becomes: *"This return has been approved. Cancelling will attempt to reverse approval side effects. Type CANCEL to confirm."*

This is the **only remaining P0 hotfix**. Once this lands, the P0 tier is fully closed and the release blocker is removed.

---

### 13.3 P1 — Extract shared components

Both pages duplicate roughly 250 lines of low-risk shared code: settle payment dialog, print helper, formatters, status badge, and order search. The duplication is already a tax — when the settle flow changes you have to change it twice and one of them will drift.

#### P1-1 — Extract `SettlePaymentDialog`

- **Today:** `sales-returns/page.tsx:854-1014` and `pos-refunds/page.tsx:633-746` are byte-for-byte similar in structure (header gradient, summary cards, balance banner, settlement form, footer).
- **Plan:** New `components/refunds/SettlePaymentDialog.tsx`. Props: `{ document, balances, sourceLabel, sourceRef, history, onSubmit, onClose }`. Each page becomes a thin wrapper that fetches the row and passes props.
- **Fixes in one shot:** 2.8 (stale `openSettle`), 3.1 (duplication), 4.1 (no cap on amount), 4.2 (no history in POS settle), 4.8 (closed-state UX).
- **Acceptance:**
  - Both pages render the same dialog structure (snapshot test or visual diff).
  - History is shown in both pages once the row is fetched fresh.
  - Net change: ~+250 new / −360 dup → **~−110 lines** across the two pages.

#### P1-2 — Extract `printInNewWindow`

- **Today:** `sales-returns/page.tsx:425-443` and `pos-refunds/page.tsx:280-308` open a new window, write a tiny HTML doc, and call `win.print(); win.close()` with a fragile `setTimeout(150)`.
- **Plan:** `lib/print-window.ts` exports `printInNewWindow(el: HTMLElement, title: string)`. Caller passes a ref; internals use `useLayoutEffect` instead of `setTimeout`.
- **Fixes:** 3.2 (duplication), 7.2 (race on slow machines).
- **Acceptance:**
  - Both pages call the helper; no `setTimeout(150)` in either page.
  - Print fires after the layout settles (no race on slow machines).

#### P1-3 — Move formatters and badge to `lib/`

- **Today:** `statusBadge`, `fmtDate`, `fmtNum`, `reasonLabel`, `methodLabel` defined in both pages.
- **Plan:** `lib/format.ts` (formatters) and `components/ui/status-badge.tsx` (badge). Take reason/method maps as a parameter so the badge doesn't hard-code the sales-return set.
- **Fixes:** 3.3, 3.4.
- **Acceptance:**
  - `grep -R "function statusBadge" app/` returns zero results.
  - Pages import the helpers from `lib/format`.

#### P1-4 — `<SearchableOrderSelect />` with debounce

- **Today:** `sales-returns` and `pos-refunds` each wrap `CustomSelect` with their own endpoint and a non-debounced search.
- **Plan:** Shared `components/ui/searchable-order-select.tsx` with props `{ endpoint, filter?, labelFn }` and a 300ms debounce.
- **Fixes:** 3.5, 7.1.
- **Acceptance:**
  - Both pages use the same component.
  - Network tab shows one request per ~300ms of typing, not one per keystroke.

#### P1-5 — Localised list mutations instead of `refreshKey++`

- **Today:** every action refetches the full list.
- **Plan:** Adopt SWR or `@tanstack/react-query` (transitively present). On success, mutate the affected row in place.
- **Fixes:** 7.3.
- **Acceptance:**
  - Approve / complete / cancel / settle: only one network round-trip per action, list re-renders without a full refetch.
  - List state stays in sync with server after each action.

#### P1-6 — Dead `update()` and missing `tenant_id` on edit

- **Resolved by P0-2** (services no longer export `update()`). Track under the same PR for symmetry.

**Definition of Done for P1:**
- Both pages share the new components.
- Both lists show identical settle UX (including history).
- `grep -R "function statusBadge\|function fmtDate\|function fmtNum\|function reasonLabel\|function methodLabel" app/` returns zero results.
- ESLint reports no new dead exports.

---

### 13.4 P2 — UX and type hygiene

Tighten UX edge cases (silent unit-price edits, missing colors, no CSV export, copy that under-promises) and clean up `as any` casts and ad-hoc types. None of these are correctness bugs; all are debt that compounds.

#### P2.A — UX gaps

**#2.6 — Edit allowed after approval**
- **File:** `app/(protected)/sales-returns/page.tsx:190-225`
- **Fix:** Confirm with backend whether edit is allowed only while `status === 'pending'`. If yes, hide the Edit button (and disable the order select) when `r.status !== 'pending'`.

**#2.10 — Credit note shows `-` for missing product name**
- **File:** `components/invoices/CreditNote.tsx:83`
- **Fix:** Fallback chain: `item.item_name ?? item.product?.name ?? item.variation?.name ?? '-'`.

**#2.11 — `formatQty` shows `0.00` for zero**
- **File:** `components/invoices/CreditNote.tsx:6-9`
- **Fix:** Early return `'0'` when `Number(n) === 0`.

**#2.12 — Subtotal vs Refund Total are the same value**
- **File:** `components/invoices/CreditNote.tsx:104-110`
- **Fix:** Drop the Subtotal row **or** keep it only when `total_amount !== refund_amount` and add a one-line comment explaining the difference.

**#2.14 — Approve button copy doesn't say "stock not yet restored"**
- **File:** `app/(protected)/sales-returns/page.tsx:368-380`
- **Fix:** Update confirm to: *"Approve this return? Stock will be restored on the next step (Complete & Restock)."*

**#4.3 — Unit price silently editable**
- **Files:** both pages, line-item form
- **Fix:** Show small "(original: X)" next to the input. If value differs, require an "Override unit price" checkbox before the change is accepted. Audit-log the override server-side.

**#4.5 — `order_payment_status: refunded` has no color**
- **File:** `sales-returns/page.tsx` order column
- **Fix:** Extend the status→color map; add `'refunded'` → purple.

**#4.6 — No CSV export**
- **Files:** both list pages
- **Fix:** Add an `Export CSV` button. Easiest: client-side CSV from the current page rows, with proper escaping.

#### P2.B — Type safety

**#5.1 — `(row.original as any).sales_order` casts everywhere**
- **Fix:** `SalesReturn.sales_order?: {...}` is declared; remove the casts. Compile errors will surface any real drift.

**#5.2 — `PosOrderItemForRefund` imported and ad-hoc `RefundLine` declared**
- **Fix:** Pick one source of truth. Probably rename the page-local one and reuse the service type.

**#5.3 — `RefundLine` missing `pos_order_item_id`**
- **Fix:** Verify with backend. If the API needs both ids, add `pos_order_item_id: number` to the type.

**#5.4 — Inline anonymous type for `printItems`**
- **Fix:** Promote to a named `PrintItem` in `components/invoices/CreditNote.tsx` and export it.

**#2.13 — Dead `posRefundService.update`**
- **Fix:** Resolved by P0-2.

**Definition of Done for P2:**
- No `as any` on fields that exist on the type.
- No inline anonymous types in page state.
- All UX warnings render in the flows above.
- `tsc --noEmit` passes.
- CSV export of a 100-row list works in both pages.

---

### 13.5 P3 — Security, permissions, accessibility

Last-mile hardening: permission checks for non-read actions, tenant-boundary confirmation, focus management, and a11y labels. None are bugs; together they close the gap before a wider audience uses these flows.

#### #6.1 — Coarse permission checks

- **Files:** `app/(protected)/sales-returns/page.tsx:127`, `app/(protected)/pos-refunds/page.tsx:92`
- **Fix:** Add `usePermissions` checks for `create-*`, `approve-*`, `complete-*`, `settle-*`. Hide buttons when scope is missing. Backend still enforces, but the UI shouldn't offer the action.

#### #6.2 — Tenant boundary on `loadOrderOptions`

- **File:** `app/(protected)/sales-returns/page.tsx` order fetch
- **Fix:** Confirm with backend that `/api/v1/sales-order` is scoped by the user's tenant for non-super-admin. Add an integration test that a non-super-admin user sees 0 rows from another tenant.

#### #8.1 — Icon-only buttons lack `aria-label`

- **Files:** both list pages
- **Fix:** Add `aria-label="Settle payment for {refund_number}"` etc. Keep `title` for tooltips.

#### #8.2 — Settle dialog traps no focus

- **Files:** both pages
- **Fix:** First focusable element gets `autoFocus`. On close, return focus to the row's button. Extract a small `useFocusTrap` hook in `lib/`.

#### #8.3 — Errors are colour-only

- **Files:** both pages
- **Fix:** Add `aria-invalid="true"` to invalid inputs and a small inline `<AlertTriangle />` icon next to the error message.

**Definition of Done for P3:**
- `axe-core` run on both pages reports zero serious violations.
- A user with `view-*` only sees no Approve/Complete/Settle buttons.
- A non-super-admin's `loadOrderOptions` returns 0 rows from another tenant.
- Tab key cycles through the settle dialog and returns to the opener on close.
- Permission matrix documented in a comment block in the page (or a sibling `docs/permissions.md`).

---

### 13.6 PO — Questions for the product owner

These decisions unblock several fixes from §13.3–§13.5. Please reply with the answer for each.

1. **Edit after approval** — Should editing a Sales Return after approval be allowed? If not, hide the Edit button when `status !== 'pending'`. *(Ties to P2-A #2.6.)*
2. **Tax / registration number on credit note** — Does the credit note need the tenant's tax/registration number? Currently it is pure transaction-level. *(Ties to P2-A #2.12.)*
3. **`store_credit` semantics** — Is `store_credit` a real settlement method that creates a customer credit balance, or just a tag that records intent? (Affects settlement type and accounting export.)
4. **Reject vs Cancel for POS Refund** — Is rejecting a refund a separate flow from cancelling? The status union has both but the UI only exposes cancel. *(Ties to §13.2.)*
5. **Print fidelity** — Should the print window honour the user's paper size, locale, and currency formatting? Currently hard-coded font size, browser default locale.

---

### 13.7 Effort estimate (cumulative)

| Tier | Items | Rough effort | Risk |
|---|---|---|---|
| P0 | 1 issue remaining (§13.2) | 0.25 day | Low (surgical) |
| P1 | 6 sub-tasks | 2–3 days | Medium (regression on settle UX — diff both pages) |
| P2 | ~10 sub-tasks | 1 day | Low |
| P3 | 5 sub-tasks | 0.5 day | Low |
| Backend | §13.1 | 1 day (their time) | – |
| Product owner | §13.6 | 0 day until replied | – |

### 13.8 Order of operations

1. Land §13.2 (P0-3) — the last P0 hotfix — in a small PR.
2. Land §13.1 (backend combined endpoint) — independent PR on the Laravel repo; client picks it up automatically.
3. Land §13.3 (P1) in one PR; it consolidates the duplication.
4. Land §13.4 (P2) and §13.5 (P3) in separate small PRs.
5. Resolve §13.6 product-owner questions in parallel; results feed back into P2 items.
