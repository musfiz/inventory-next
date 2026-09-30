# Purchase Return (Return to Vendor) Plan — Frontend (inventory-ui)

Backend counterpart: `inventory-api/docs/PURCHASE_RETURN_PLAN.md` (flow, rules, API contract, accounting).

## 1. Goals

- Let staff return damaged, wrong or excess goods to a vendor, either while receiving a purchase order or afterwards.
- Follow the same UX as the sales return page so users learn one pattern.
- Fill the existing dead sidebar link `/purchase-order-return`.

## 2. What already exists

| Item                                                                            | Location                                                                | Note                                                            |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| Sidebar link `/purchase-order-return` (permission `view-purchase-order-return`) | `components/layout/sidebar.tsx`                                         | Dead link today                                                 |
| Sales return page (reference)                                                   | `app/(protected)/sales-return/page.tsx`                                 | List, slide-in form, details, settle dialogs                    |
| Sales return service (template)                                                 | `services/salesReturnService.ts`                                        | list, show, store, approve, complete, cancel, destroy, settle   |
| Sales return types                                                              | `types/api.types.ts` (about lines 787-885)                              | Mirror for purchase                                             |
| Credit note print set                                                           | `components/print/invoices/CreditNote*.tsx`, `SalesReturnPrintMenu.tsx` | Template for the debit note                                     |
| Purchase order print                                                            | `PurchaseOrderInvoice.tsx`, `PurchaseOrderThermal.tsx`                  | Header layout to reuse                                          |
| `notify` and `confirm` helpers                                                  | `@/lib/notifications`                                                   | Use for feedback                                                |
| `PurchaseOrder` interface                                                       | `services/purchaseOrderService.ts`, `types/api.types.ts`                | Minimal, ids typed as `number` though backend uses UUID strings |

## 3. Prerequisite fixes

- `app/(protected)/purchase-orders/page.tsx` `handleReceive` sends the remaining quantity as `quantity_received`, but the backend treats it as the absolute total received. Fix so the value sent is `already received + newly received`. Returns are validated against this number.
- Permission names in this page (`receive-purchase-orders`, `update-purchase-orders`, ...) are plural and not seeded, so only super admins see them. New code should use the seeded singular names (`create-purchase-order-return`, ...) and the existing pages should be aligned separately.

## 4. Types and service

- `types/api.types.ts`: `PurchaseReturn`, `PurchaseReturnItem`, `PurchaseReturnStatus` (`draft | pending | approved | completed | cancelled`), `PurchaseReturnType` (`rejected_at_receipt | post_receipt`), `PurchaseReturnResolution` (`credit_note | refund | replacement`), `PurchaseReturnReasonCode`, `ReturnablePurchaseItem` (`received`, `returned`, `on_hand`, `max_returnable`), `PurchaseReturnSettlement`. Use `string` UUID ids.
- `services/purchaseReturnService.ts`, patterned on `salesReturnService.ts`: `list`, `show`, `store` (upsert), `approve`, `complete`, `cancel`, `destroy`, `settle`, `getOrderReturns(poId)`, `getReturnableItems(poId)`.
- Export it from `services/index.ts`.

## 5. Purchase Return page — `/purchase-order-return`

New page: `app/(protected)/purchase-order-return/page.tsx`. Patterned on the sales return page.

**List** (`DataTable`)

- Columns: return number, debit note number, PO number, supplier, warehouse, date, total, status badge, settlement status.
- Filters: status, supplier, date range, return type.

**Create/edit form** (slide-in panel, `pending` returns only)

- Tenant select for super admin only.
- PO search dropdown (`CustomSelect`); only POs with received quantity.
- On selecting a PO, call `getReturnableItems` and show per line: ordered, received, already returned, on hand in warehouse, max returnable.
- Per line: quantity (capped at `max_returnable`), reason code select, note.
- Header: return date, resolution (credit note or refund), vendor reference, notes.
- Live totals (subtotal, discount, tax, total) computed from the PO's discount ratio and VAT percent, shown as an estimate; the backend value is authoritative.

**Row actions by status** (with `usePermissions` and `confirm`)

- `pending`: approve, edit, cancel, delete
- `approved`: complete ("Goods sent to vendor"), cancel
- `completed`: print debit note, settle

**Dialogs**

- Details: items, reasons, PO and vendor references, journal/settlement summary.
- Settle: refund received or apply credit, amount capped at the outstanding balance, payment method, reference.

## 6. Purchase order screen changes

`app/(protected)/purchase-orders/page.tsx`

- Receive modal: per line add "Rejected qty" and "Reason" next to "Received qty" (Phase 2 in the backend plan). Show a summary: accepted, rejected, remaining.
- After a receive that produced rejections, show a link to the auto-created pending return.
- PO details modal: "Returns" section (from `getOrderReturns`) with returned quantity per line, returned amount, and net payable (`total - returned - paid`).
- Row action "Return to vendor" for POs with received quantity, opening the return form prefilled with the PO.
- Disable delete and cancel when the PO has returns.

`app/(protected)/purchase/manage/page.tsx` (scan-based Purchase Entry)

- Optional: mark a scanned item as damaged and enter it as rejected, so the physical check and the return happen in one flow.

## 7. Debit note printing

Add to `components/print/`:

- `invoices/DebitNoteA4.tsx` and `invoices/DebitNoteThermal.tsx`, based on the credit note components and the shared helpers in `invoices/shared.tsx`.
- `PurchaseReturnPrintMenu.tsx`, based on `SalesReturnPrintMenu.tsx` (A4, 80 mm, 58 mm; lazy-load the full return before printing).
- Export from `components/print/index.ts`.
- Content: debit note number and date, supplier, original PO number, vendor chalan number, warehouse, items with reason codes, quantity, unit cost, line totals, discount, tax, total, prepared and approved by, signature blocks.

## 8. Reports

- New report page `app/(protected)/reports/purchase/purchase-return` (`reportService.ts` already calls the endpoint) and a sidebar entry in the Purchase Reports group (permission `view-purchase-return-report`).
- Update purchase reports to show gross, returns and net where the backend adds them (PO summary, by supplier, supplier scorecard, supplier statement, aging).

## 9. Permissions in the UI

Use the seeded names: `view-purchase-order-return`, `create-`, `approve-`, `complete-`, `cancel-`, `delete-`, `settle-`, `print-purchase-order-return`. Redirect to `/access-denied` on the page without the view permission, and hide buttons without the action permission. The backend middleware is the real enforcement.

## 10. Demo mode

New write actions are blocked by the backend demo middleware and return `403` with `code: DEMO_MODE`. The axios interceptor plan (notice instead of `/access-denied` redirect) covers them.

## 11. Tests (Vitest)

- [ ] Returnable quantity cap: quantity input cannot exceed `max_returnable`.
- [ ] Totals estimate matches discount ratio and VAT formula.
- [ ] Row actions and buttons per status and permission.
- [ ] Receive modal: rejected quantity plus received quantity cannot exceed ordered; sent payload uses absolute received total.
- [ ] Debit note renders all required fields for A4 and thermal.

## 12. Checklist

- [ ] Fix `handleReceive` quantity bug
- [ ] Types and `purchaseReturnService`
- [ ] `/purchase-order-return` page (list, form, details, settle)
- [ ] Receive modal rejection fields
- [ ] PO details "Returns" section and "Return to vendor" action
- [ ] Debit note print set and print menu
- [ ] Purchase return report page and sidebar entry
- [ ] Tests

## 13. Open decisions

1. Should the Purchase Entry scan page (`purchase/manage`) support marking damaged items, or only the PO receive modal?
2. Show estimated totals in the form, or only after the backend calculates them?
3. Replacement flow UI (Phase 3): a "Receive replacement" action on the PO, or the normal receive modal with a raised cap?
