# B2B Storefront Implementation Plan

## Objective
Upgrade the existing B2C storefront into a hybrid B2B/B2C platform. The existing codebase was already architected with B2B intent (customer types, dealer price field, credit limit/balance, customer groups), but the actual B2B checkout workflows, tiered pricing, and procurement features are not yet implemented. This plan bridges that gap.

---

## Current B2B-Ready Assets (already in the codebase)

| Asset | Location | What's there |
|---|---|---|
| Customer types | `customers.type` enum | `own`, `retail`, `wholesale`, `corporate`, `dealer` |
| Company fields | `customers` table | `company_name`, `contact_person`, `nid_number` |
| Credit infrastructure | `customers` table | `credit_limit`, `current_balance`, `outstanding_balance`, `payment_terms` |
| Dealer price | `product_variations.dp` | Per-variation wholesale/dealer price column |
| Customer groups | `customer_groups` table | Group-level `discount_type`, `discount_value`, `min_order_amount` |
| Multiple addresses | `customer_addresses` table | Per-customer saved addresses with default flag |
| Payment methods | `ecommerce_orders.payment_method` | Already includes `bank_transfer`, `check`, `credit` |
| Business type FK | `tenants.business_type_id` | Links tenant to a business type |

---

## Phase 1 — B2B Storefront Configuration & Feature Flags

**Goal:** Let each tenant toggle B2B mode and configure B2B-specific behavior without code changes.

### Backend

1. **Migration: add B2B columns to `storefront_configs`**
   - `storefront_type` enum (`b2c`, `b2b`, `hybrid`) default `b2c`
   - `require_login_to_browse` boolean default `false`
   - `require_login_to_see_prices` boolean default `false`
   - `enable_purchase_orders` boolean default `false`
   - `enable_credit_checkout` boolean default `false`
   - `enable_rfq` boolean default `false`
   - `default_payment_terms` string(50) nullable (e.g. `net_30`)
   - `min_order_amount` decimal(15,2) nullable
   - `enable_tiered_pricing` boolean default `false`

2. **`StorefrontConfigController`**: expose new fields in the `/api/v1/storefront/settings` response.

3. **Middleware / guard**: when `require_login_to_browse` is true, unauthenticated visitors to any `/store/*` route (except `/store/account/login`) get redirected. When `require_login_to_see_prices` is true, prices are omitted from the API response for unauthenticated requests.

### Frontend

4. **`useStorefrontSettings` hook / Zustand store**: cache settings; expose flags to components.
5. **Price gating UI**: if `require_login_to_see_prices` is active and the user is not logged in, show "Login to see pricing" instead of the price on `ProductCard`, product detail page, and cart.
6. **Browse gating UI**: redirect to login with a message like "This store requires an account. Please sign in or request access."

---

## Phase 2 — Tiered & Customer-Specific Pricing

**Goal:** Show the right price to the right customer based on their type, group, or negotiated volume breaks.

### Backend

1. **New table: `product_pricing_tiers`**
   ```
   id, tenant_id, variation_id, customer_type (nullable), customer_group_id (nullable),
   min_quantity, price, discount_percentage (nullable), is_active,
   created_at, updated_at
   ```
   - When both `customer_type` and `customer_group_id` are null → default public tier.
   - Specificity order: customer-group-specific > customer-type-specific > default.

2. **Pricing resolution service: `StorefrontPricingService`**
   - Input: `variation_id`, `customer` (nullable), `quantity`.
   - Logic:
     a. If the customer belongs to a group with a matching tier row → use it.
     b. Else if the customer has a type with a matching tier row → use it.
     c. Else if the variation has a `dp` and the customer is wholesale/corporate/dealer → use `dp`.
     d. Else → `selling_price`.
   - Returns: `{ unit_price, tier_label (e.g. "Buy 12+ for ৳85 each"), was_negotiated }`.

3. **Integrate into API responses**:
   - `StorefrontCatalogController::mapProduct()` — add `b2bPrice` / `tieredPricing[]` when the request is authenticated as a B2B customer. B2C customers continue seeing `sellingPrice` / `mrp`.
   - `StorefrontCheckoutController` — resolve final unit price via the pricing service, not just `variation.selling_price`.

4. **Admin: Pricing Tiers CRUD page** (out of storefront scope — admin dashboard) — link under Ecommerce > Products, per-variation tier editor.

### Frontend

5. **`ProductCard` / Product detail page**: show the B2B tier price or `dp` when the logged-in customer qualifies. Show a "volume pricing" badge/table if tiers exist (e.g. "1–11 units: ৳100 | 12–49: ৳85 | 50+: ৳72").
6. **Cart store**: when a B2B customer adds to cart or changes quantity, recalculate `unitPrice` from the pricing service (API call or embed tiers in the product payload and resolve client-side).

---

## Phase 3 — Minimum Order Quantity (MOQ) & Minimum Order Value

**Goal:** Enforce wholesale-level minimums at both the product and cart/checkout level.

### Backend

1. **Migration: add `min_order_quantity` to `product_variations`** — integer, default 1. For B2B products, set to e.g. 12 (one case/carton).
2. **Validation at checkout** (`StorefrontCheckoutController`) — reject if any line item quantity < its `min_order_quantity`.
3. **Cart/order-level MOV** — reject checkout if cart subtotal < `storefront_configs.min_order_amount`.

### Frontend

4. **Product detail page**: quantity selector min value = `min_order_quantity`; show "Min. order: 12 units".
5. **Cart page**: disable checkout button + show banner when subtotal < MOV. Highlight any line items below their MOQ.

---

## Phase 4 — Purchase Order (PO) & Approval Workflow

**Goal:** Let B2B buyers attach a PO reference to their orders, and optionally route orders through an approval step before processing.

### Backend

1. **Migration: add columns to `ecommerce_orders`**
   - `po_reference` string(100) nullable
   - `po_document_path` string nullable (uploaded file)
   - `approval_status` enum (`none`, `pending`, `approved`, `rejected`) default `none`
   - `approved_by` FK to `customers` (nullable) — the account admin who approved
   - `approved_at` timestamp nullable
   - `internal_notes` text nullable

2. **Checkout flow change**: when `enable_purchase_orders` is on and the customer is B2B:
   - Show a "PO Reference" field (optional or required based on config).
   - Allow file upload for a PO document.
   - If `enable_credit_checkout` is on and the customer's `credit_limit` covers the order, allow "Pay on Credit (Net 30)" as a payment method → sets `payment_method = credit`, `payment_status = pending`, `approval_status = pending`.

3. **Approval API endpoints**:
   - `POST /api/v1/storefront/account/orders/{id}/approve`
   - `POST /api/v1/storefront/account/orders/{id}/reject`
   - Only available to the customer account owner or designated approver.

4. **Notification**: email to the buyer + admin when an order is placed on credit; email to the buyer when approved/rejected.

### Frontend

5. **Checkout page**: conditional PO reference field + file upload, "Pay on Credit" option with credit limit display.
6. **Account > Orders page**: show `approval_status` badge; "Approve" / "Reject" buttons for the account owner on pending orders.
7. **Admin dashboard**: B2B orders list with approval controls (out of storefront scope, but important for the back-office).

---

## Phase 5 — Request for Quote (RFQ)

**Goal:** Let B2B buyers request custom pricing on large or bespoke orders before committing.

### Backend

1. **New tables**:
   - `rfqs` — `id, tenant_id, customer_id, status (draft, submitted, quoted, accepted, expired, rejected), notes, valid_until, created_at, updated_at`
   - `rfq_items` — `id, rfq_id, variation_id, requested_quantity, offered_price (nullable, filled by admin), notes`

2. **Endpoints**:
   - `POST /api/v1/storefront/account/rfq` — submit an RFQ from the cart contents.
   - `GET /api/v1/storefront/account/rfqs` — list my RFQs.
   - `GET /api/v1/storefront/account/rfqs/{id}` — detail view.
   - Admin-side: CRUD + "send quote" action that sets `offered_price` on each item and emails the PDF to the buyer.

3. **"Accept Quote" → auto-create order**: when the buyer accepts a quote, convert RFQ items into an `ecommerce_order` at the quoted prices.

### Frontend

4. **"Request a Quote" button** on the cart page (visible only when `enable_rfq` is on and the customer is logged in).
5. **Account > Quotes page**: list/detail RFQs, "Accept Quote" / "Reject" actions, download quote PDF.

---

## Phase 6 — Server-Side Cart & Saved Carts

**Goal:** Persist the B2B cart server-side so it survives across sessions/devices and supports approval workflows.

### Backend

1. **New tables**:
   - `storefront_carts` — `id, tenant_id, customer_id (nullable for guest), name (nullable, for "Saved Cart: Q3 Office Supplies"), status (active, saved, converted), created_at, updated_at`
   - `storefront_cart_items` — `id, cart_id, variation_id, quantity, unit_price (resolved at add-time), notes`

2. **Endpoints**:
   - `GET/POST/PUT/DELETE /api/v1/storefront/cart` — standard CRUD.
   - `POST /api/v1/storefront/cart/save` — save current cart as a named draft.
   - `GET /api/v1/storefront/account/saved-carts` — list saved carts.
   - `POST /api/v1/storefront/cart/restore/{id}` — restore a saved cart to the active cart.

3. **Pricing sync**: when items are added, resolve `unit_price` from `StorefrontPricingService`. On cart load (if >24h old), re-validate pricing.

### Frontend

4. **Hybrid cart strategy**: keep the local Zustand cart for B2C (no login required), but sync to the server when the customer logs in. For B2B mode (`require_login_to_browse` = true), use server cart exclusively.
5. **"Save Cart" button** on the cart page, "My Saved Carts" in the account sidebar.

---

## Phase 7 — B2B Registration & Account Management

**Goal:** Differentiate B2B sign-up from B2C; collect company info upfront; optionally require admin approval before B2B accounts are activated.

### Backend

1. **Migration: add to `storefront_configs`**
   - `b2b_registration_requires_approval` boolean default `false`

2. **Registration endpoint change** (`CustomerAuthController::register`):
   - Accept optional fields: `company_name`, `contact_person`, `customer_type` (from a limited set: `wholesale`, `corporate`, `dealer`).
   - If `b2b_registration_requires_approval` is on and the registrant picks a B2B type → set `status = pending` on the customer record (new column if not already present) → email admin for approval.

3. **Admin approval**: `PUT /api/v1/customers/{id}/approve` — sets status to active + sends welcome email with login link.

### Frontend

4. **Registration form**: add a "I'm registering as a business" toggle. When on, show `company_name`, `contact_person` fields, and a customer-type dropdown (`wholesale`, `corporate`, `dealer`). The captcha remains for all registrations.
5. **Pending approval state**: show "Your account is under review. We'll email you once approved." on login attempt.
6. **Account dashboard**: show company info, credit limit, current balance, payment terms in a "Business Profile" card.

---

## Phase 8 — B2B-Specific UI Polish

**Goal:** Tailor the storefront experience for B2B buyers.

### Frontend-only

1. **Quick reorder**: on Account > Orders page, "Reorder" button that adds all items from a past order back to the cart.
2. **Bulk add-to-cart**: on the product listing page, allow entering quantity directly on each product card and adding multiple products to cart in one click (a "Bulk Order" mode / spreadsheet-style grid).
3. **SKU search in header**: B2B buyers often search by SKU; the search suggest endpoint already matches on `variations.sku`, just make it more prominent with a "Search by SKU" placeholder text when in B2B mode.
4. **Invoice / statement downloads**: on Account > Orders, add "Download Invoice (PDF)" and "Download Account Statement" buttons (PDF generation on the backend).
5. **Credit dashboard widget**: if the customer has a `credit_limit > 0`, show a small card on the account page with available credit, outstanding balance, and upcoming payment due dates.

---

## Implementation Order & Dependencies

```
Phase 1 (Config/Feature Flags)
   ↓
Phase 2 (Tiered Pricing) ←── depends on Phase 1 flags
   ↓
Phase 3 (MOQ / MOV) ←── depends on Phase 2 pricing service
   ↓
Phase 7 (B2B Registration) ←── can run in parallel with 2–3
   ↓
Phase 4 (PO / Approval) ←── depends on Phase 1 flags + Phase 7 accounts
   ↓
Phase 6 (Server Cart) ←── depends on Phase 2 pricing service
   ↓
Phase 5 (RFQ) ←── depends on Phase 6 server cart
   ↓
Phase 8 (UI Polish) ←── can start after Phase 2, runs parallel with 4–7
```

## Out of Scope (for this plan)

- **Multi-company hierarchy** (parent company → subsidiaries): requires a deeper account-tree model, deferred to a future plan.
- **EDI / ERP integration** (ANSI X12, SAP iDoc): enterprise-only; not relevant at current scale.
- **Marketplace / multi-vendor**: the app is single-tenant-per-storefront, not a marketplace.
- **Contract management** (long-term supply agreements with committed volumes): deferred until RFQ (Phase 5) is validated.
