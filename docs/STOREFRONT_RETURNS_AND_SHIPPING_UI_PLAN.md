# Storefront Returns & Refunds and Shipping — UI/UX Plan

## Overview

This plan covers two Storefront Orders sub-pages that are currently stubs:

1. **Returns & Refunds** (`/ecommerce/orders/returns`) — Return request queue, approval workflow, refund management
2. **Shipping Zones & Rates** (`/ecommerce/orders/shipping-zones`) — Shipping zones, rate tiers, courier configuration, delivery estimates

Both pages follow the established patterns from the All Orders and Order Status pages (DataTable + inline forms / slide-over detail panels, KPI cards, skeleton loading, dark mode support).

---

## Part 1: Returns & Refunds Page

### Context

The current page is a `PageStub` placeholder. The sidebar link is at `/ecommerce/orders/returns` with the `RotateCcw` icon. There is an existing `SalesReturn` / `SalesReturnItem` model in the backend for POS sales returns, but this page needs a dedicated ecommerce return workflow that integrates with the `EcommerceOrder` model's `returned` status.

### 1.1 Type System (`types/ecommerce.ts`)

```typescript
export interface EcommerceReturn {
  id: string;
  return_number: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  items_count: number;
  return_reason: string;
  return_note?: string;
  status: 'pending' | 'approved' | 'rejected' | 'items_received' | 'refunded' | 'completed' | 'cancelled';
  refund_method: 'original' | 'bkash' | 'nagad' | 'bank_transfer' | 'store_credit';
  refund_amount: number;
  refund_status: 'pending' | 'processing' | 'completed' | 'failed';
  refund_transaction_id?: string;
  images?: string[];
  requested_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejected_reason?: string;
  refunded_at?: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface EcommerceReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  reason?: string;
  condition: 'unused' | 'opened' | 'damaged' | 'defective';
  is_restockable: boolean;
}

export interface ReturnKPIs {
  total_returns: number;
  pending_returns: number;
  approved_returns: number;
  rejected_returns: number;
  refunded_today: number;
  total_refund_amount: number;
  avg_processing_time_hours: number;
  returns_by_status: { status: string; count: number }[];
  top_return_reasons: { reason: string; count: number }[];
  monthly_returns: { month: string; count: number; amount: number }[];
}

export type ReturnStatusAction = 'approve' | 'reject' | 'receive_items' | 'process_refund' | 'complete' | 'cancel';
```

### 1.2 Service Layer (`services/ecommerceReturnService.ts`)

Following the `ecommerceOrderService.ts` pattern exactly — class with real API calls + mock fallback.

| Method | Returns | Purpose |
|--------|---------|---------|
| `list(params)` | `{data, total, page, per_page}` | Paginated list with status, date, search filters |
| `getById(id)` | `EcommerceReturn` | Full detail with return items |
| `store(data)` | `EcommerceReturn` | Create a new return request |
| `updateStatus(id, status, note?)` | `void` | Approve / reject / receive items / complete |
| `processRefund(id, data)` | `void` | Process refund payment |
| `getKPIs()` | `ReturnKPIs` | Dashboard KPIs |
| `delete(id)` | `void` | Delete/cancel a return request |

**Mock data:**
- 10-15 mock returns across all statuses
- Realistic return reasons (wrong size, defective product, damaged in transit, etc.)
- Varying refund amounts and methods
- Some with admin notes and rejection reasons

### 1.3 Component Tree

```
ReturnsPage
├── PageHeader (title + "New Return" button)
├── ReturnStatCards (6 cards: Total, Pending, Approved, Rejected, Refunded Today, Total Refunded)
├── ReturnFilters (status, date range, search by order # / customer)
├── DataTable (with status badges + actions)
├── ReturnDetailPanel (slide-over drawer)
│   ├── Return info header
│   ├── Customer + order info
│   ├── Return items table
│   ├── Status timeline
│   ├── Reason + images
│   ├── Actions (approve/reject/receive/refund per status)
│   │   ├── Approve → confirmation + optional note
│   │   ├── Reject → require rejection reason
│   │   ├── Receive Items → confirm items received + condition check
│   │   └── Process Refund → method + amount + transaction ID
│   └── Admin notes section
└── ReturnForm (slide-over or inline, for manual return creation)
```

### 1.4 Pages

**ReturnsPage** (`app/(protected)/ecommerce/orders/returns/page.tsx`):

```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Returns & Refunds          [+ New Return] [Export]   │
├─────────────────────────────────────────────────────────┤
│ ┌── Return Stat Cards (6-card grid) ───────────────┐    │
│ │ Total  Pending  Approved  Rejected  Refunded  $   │    │
│ └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│ [Filters...]                                   [Search] │
├─────────────────────────────────────────────────────────┤
│ ┌── DataTable ─────────────────────────────────────┐    │
│ │ [#] [Return #] [Order] [Customer] [Items] [$]    │    │
│ │     [Status] [Date] [Actions]                    │    │
│ └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
│
← ReturnDetailPanel (slide-over drawer)
```

**Columns:**

| Column | Width | Render |
|--------|-------|--------|
| `#` | 4% | Serial |
| `Return #` | 11% | Monospace link, clickable → detail |
| `Order #` | 11% | Link to parent order |
| `Customer` | 14% | Name + email (two-line) |
| `Items` | 4% | Count badge |
| `Refund Amount` | 10% | ৳ amount |
| `Status` | 12% | Color-coded pill with icon |
| `Date` | 8% | Relative time |
| Actions | 8% | Process / View |

**Status badges:**

| Status | Color |
|--------|-------|
| pending | `bg-blue-100 text-blue-800` |
| approved | `bg-indigo-100 text-indigo-800` |
| rejected | `bg-red-100 text-red-800` |
| items_received | `bg-purple-100 text-purple-800` |
| refunded | `bg-green-100 text-green-800` |
| completed | `bg-gray-100 text-gray-800` |
| cancelled | `bg-amber-100 text-amber-800` |

### 1.5 Return Action Workflow (status transitions)

```
pending ──→ approved ──→ items_received ──→ refunded ──→ completed
  │            │                              │
  └──→ rejected                                └──→ failed
  │
  └──→ cancelled
```

- **Approve** → optional note, auto-calculates refund amount
- **Reject** → require reason (required field)
- **Receive Items** → confirm quantity received, log condition per item (unused/opened/damaged/defective), mark restockable items
- **Process Refund** → select refund method (original/bKash/Nagad/bank transfer/store credit), enter transaction ID, confirm amount
- **Complete** → auto-update `EcommerceOrder` status to `returned`

### 1.6 States

| State | Visual |
|-------|--------|
| **Loading** | 6 skeleton stat cards + shimmer table rows |
| **Loaded** | Full rendered layout |
| **Empty (no returns)** | Illustration: "No return requests yet" + description |
| **Empty (filtered)** | "No returns match your filters" + reset link |
| **Error (load)** | Error banner above table + retry |
| **Action in progress** | Loading spinner on action button in detail panel |
| **Action success** | Toast + optimistic list update |
| **Action failure** | Toast error + revert optimistic update |

### 1.7 Edge Cases

| Scenario | Handling |
|----------|----------|
| Partial return (only some items) | Item-level return tracking; only returned items' value refunded |
| Multiple returns on one order | Track separately; prevent duplicate returns for same item+quantity |
| Return after full refund | Disallow — status shows "completed"; show warning |
| Refund method = original (expired card) | Allow admin to override refund method; log the override |
| Return with no image proof | Require at least one image for defective/damaged claims; configurable toggle |
| Items already restocked | Show "restocked" badge on item line; link to stock movement |
| Refund amount > order total | Validation: refund cannot exceed order grand total minus shipping |
| Return for cancelled order | Disallow — show error: "Cannot return a cancelled order" |
| Very old order (>6 months) | Warning banner: "Order exceeds standard return window" |
| Refund transaction fails | Allow retry with new transaction ID; log failure reason |

---

## Part 2: Shipping Zones & Rates Page

### Context

The current page is a `PageStub` placeholder at `/ecommerce/orders/shipping-zones`. There's already a `ShippingMethod` type and `shippingMethodService.ts` with mock CRUD. The backend has shipping-related columns on `EcommerceOrder` (shipping_charge, shipping_method, courier). The sidebar icon is `Truck`.

### 2.1 Type System (`types/ecommerce.ts`)

```typescript
export interface ShippingZone {
  id: string;
  name: string;
  description: string;
  countries: string[];            // Allowed countries
  cities: string[];               // Allowed cities/areas (empty = all in country)
  zip_codes?: string[];           // Optional ZIP/postal code whitelist
  is_active: boolean;
  priority: number;               // Lower = higher priority (zone matching)
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  id: string;
  zone_id: string;
  zone_name?: string;
  name: string;                   // e.g. "Standard", "Express"
  description: string;
  base_rate: number;              // Base shipping charge
  rate_type: 'flat' | 'weight_based' | 'order_total_based';
  free_shipping_threshold?: number; // Order total for free shipping
  estimated_days_min: number;
  estimated_days_max: number;
  weight_min?: number;            // kg
  weight_max?: number;            // kg
  order_total_min?: number;
  order_total_max?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Courier {
  id: string;
  name: string;
  slug: string;
  tracking_url_template?: string; // e.g. "https://pathao.com/track/{tracking_number}"
  is_active: boolean;
  supported_zones?: string[];
  created_at: string;
}

export interface ShippingKPIs {
  total_zones: number;
  total_rates: number;
  active_couriers: number;
  free_shipping_methods: number;
  avg_delivery_days: number;
  zones_by_status: { active: number; inactive: number };
}
```

### 2.2 Service Layer (`services/shippingZoneService.ts`)

**New service** (the existing `shippingMethodService.ts` is simpler; this new service expands to full zone management):

| Method | Returns | Purpose |
|--------|---------|---------|
| `listZones(params)` | `{data, total, page, per_page}` | Paginated zones with search |
| `getZone(id)` | `ShippingZone` | Zone detail with rates |
| `storeZone(data)` | `ShippingZone` | Create/update zone |
| `deleteZone(id)` | `void` | Delete zone |
| `listRates(zoneId?)` | `ShippingRate[]` | Rates, optionally filtered by zone |
| `storeRate(data)` | `ShippingRate` | Create/update rate |
| `deleteRate(id)` | `void` | Delete rate |
| `listCouriers()` | `Courier[]` | List courier options |
| `storeCourier(data)` | `Courier` | Create/update courier |
| `toggleCourier(id)` | `void` | Toggle active status |
| `getKPIs()` | `ShippingKPIs` | Dashboard KPIs |

**Mock data:**
- 4-5 zones: "Inside Dhaka", "Outside Dhaka (Major Cities)", "Outside Dhaka (Rural)", "International"
- 2-3 rates per zone with different delivery speeds
- 3-4 couriers: Pathao, Steadfast, Sundarban, eCourier

### 2.3 Component Tree

```
ShippingZonesPage
├── PageHeader (title + "Add Zone" button)
├── ShippingStatCards (5 cards: Zones, Rates, Active Couriers, Free Methods, Avg Delivery)
├── Tab Navigation: [Zones] [Couriers] [Settings]
│
├── Tab: Zones
│   ├── ZoneList (accordion-style zone cards)
│   │   └── ZoneCard
│   │       ├── Zone header (name, status toggle, country count, priority)
│   │       ├── Expanded: Cities / ZIPs (editable tag list)
│   │       └── Rates table within zone
│   │           ├── Rate name, type, base rate, estimated days
│   │           ├── Edit/Delete inline
│   │           └── "Add Rate" button
│   └── ZoneForm (inline, toggled)
│
├── Tab: Couriers
│   ├── Courier DataTable
│   │   ├── Name, Slug, Tracking URL template, Status, Actions
│   │   └── Toggle active / Edit / Delete
│   └── CourierForm (inline)
│
└── Tab: Settings
    ├── Free shipping threshold (global default)
    ├── Default delivery days
    ├── Address fallback (if no zone matches)
    └── Tax rate for shipping
```

### 2.4 Pages

**ShippingZonesPage** (`app/(protected)/ecommerce/orders/shipping-zones/page.tsx`):

```
┌──────────────────────────────────────────────────────────┐
│ 🚚 Shipping Zones & Rates        [+ Add Zone] [Export]   │
├──────────────────────────────────────────────────────────┤
│ ┌── Shipping Stat Cards ────────────────────────────┐    │
│ │ Zones  Rates  Couriers  Free Methods  Avg Days    │    │
│ └──────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│ [Zones]  [Couriers]  [Settings]                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌── Zone Tab Content ───────────────────────────────┐    │
│ │                                                    │    │
│ │  ┌── Zone Card ───────────────────────────────┐    │    │
│ │  │  [▶] Inside Dhaka            [Active] [Edit] │    │    │
│ │  │  3 cities · Priority 1 · 3 shipping rates   │    │    │
│ │  │                                               │    │    │
│ │  │  ┌── Expanded: ──────────────────────────┐   │    │    │
│ │  │  │  Cities: Dhaka, Narayanganj, Gazipur   │   │    │    │
│ │  │  │                                         │   │    │    │
│ │  │  │  Rates:                                │   │    │    │
│ │  │  │  Standard  ৳60   3-5 days  [Edit][Del] │   │    │    │
│ │  │  │  Express   ৳150  1-2 days  [Edit][Del] │   │    │    │
│ │  │  │  [+ Add Rate]                           │   │    │    │
│ │  │  └─────────────────────────────────────────┘   │    │    │
│ │  └──────────────────────────────────────────────┘    │    │
│ │                                                      │    │
│ │  ┌── Zone Card ───────────────────────────────┐    │    │
│ │  │  [▶] Outside Dhaka          [Active] [Edit] │    │    │
│ │  │  ...                                        │    │    │
│ │  └──────────────────────────────────────────────┘    │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ ← ZoneForm (inline, slides open on "Add Zone" or "Edit") │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Zone Form layout** (inline, toggled by "Add Zone" / "Edit"):

```
┌── Add Shipping Zone ────────────────────────────────┐
│ Name: [_______________]  Priority: [___]            │
│ Description: [_______________________________]      │
│                                                      │
│ Countries: [Bangladesh  ▼]  [+ Add Country]          │
│ Cities: [Dhaka ✕] [Narayanganj ✕] [Gazipur ✕]       │
│         [+ Add City]                                 │
│                                                      │
│ ZIP Codes: (optional) [_________] [+ Add]            │
│                                                      │
│ [Active]                                              │
│                                                      │
│ [Save] [Cancel]                                      │
└──────────────────────────────────────────────────────┘
```

**Rate Form** (inline within a zone card):

```
┌── Add Shipping Rate ────────────────────────────────┐
│ Name: [______________]  Type: [Flat  ▼]             │
│ Description: [_______________________________]      │
│ Base Rate: [___]  Free Threshold: [____] (optional)  │
│ Est. Delivery: [__] to [__] days                     │
│                                                      │
│ Weight Range: [__] - [__] kg (for weight-based)      │
│ Order Total: [__] - [__] ৳ (for total-based)        │
│                                                      │
│ [Active]  Sort Order: [__]                           │
│                                                      │
│ [Save] [Cancel]                                      │
└──────────────────────────────────────────────────────┘
```

**Courier Tab:**

```
┌── Couriers ─────────────────────────────────────────┐
│ [+ Add Courier]                                     │
│                                                      │
│ ┌── DataTable ──────────────────────────────────┐   │
│ │ #  Name       Slug       Track URL    Status   │   │
│ │ 1  Pathao     pathao     ✓pathao.com  Active   │   │
│ │ 2  Steadfast  steadfast  ✓steadfast  Inactive  │   │
│ └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Settings Tab:**

```
┌── Shipping Settings ────────────────────────────────┐
│ Global Free Shipping Threshold: [_____] ৳           │
│ Default Delivery Days: [_____]                       │
│                                                      │
│ Fallback Shipping Rate (when no zone matches):       │
│ ┌── Fallback Rate ──────────────────────────────┐   │
│ │ Rate: [____]  Estimated Days: [____]           │   │
│ │ Method Label: [Standard Shipping]              │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ Tax Rate for Shipping: [_____] %                     │
│                                                      │
│ [Save Settings]                                      │
└──────────────────────────────────────────────────────┘
```

### 2.5 States

| State | Visual |
|-------|--------|
| **Loading** | Skeleton stat cards + 3-4 skeleton zone accordions (shimmer) |
| **Loaded** | Full layout with zones/couriers/settings |
| **Empty (no zones)** | "No shipping zones configured" + "Create your first zone" CTA |
| **Empty (no couriers)** | "No couriers added" + "Add Courier" CTA |
| **Error** | Error banner + retry |
| **Zone accordion collapsed** | Compact single line with key details |
| **Zone accordion expanded** | Full details with cities, rates, inline edits |
| **Form validation** | Field-level errors with red border |
| **Save success** | Toast + list update |
| **Save failure** | Toast + field-level error mapping |

### 2.6 Edge Cases

| Scenario | Handling |
|----------|----------|
| Zone with no cities | Interpreted as "all cities in the country" |
| Overlapping zones (same city in 2 zones) | Lower priority number wins; show warning |
| Rate with no price set | Default to 0 (free shipping) |
| Free shipping threshold = 0 | Always free for that rate |
| Courier deleted with active orders | Soft-delete; orders retain courier name snapshot |
| Weight-based rate outside weight range | Not shown as option at checkout |
| International zone with no courier | Disable checkout for that zone; show "No shipping available" |
| Zone name conflict | Validation: zone name must be unique |
| Rate type changed (flat → weight) | Reset weight/total range fields; keep base rate |
| All couriers inactive | Warning: "No active couriers — orders cannot be shipped" |
| City name changes | Manual edit in zone; no auto-sync |

### 2.7 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Accordion-style zone cards** over DataTable | Zones have nested data (rates, cities) — accordions show it contextually without deep navigation |
| **Tabbed layout** (Zones / Couriers / Settings) | Three distinct concerns; tabs keep each focused without page overload |
| **Inline forms** for zones and rates | Quick add/edit without losing context; matches coupons/brands pattern |
| **Rate inheritance from zone** | Rates belong to a zone; zone form embeds rate management naturally |
| **Global settings tab** | Free shipping threshold and fallback apply across all zones; separate from zone-specific config |
| **City tag input** | Comma-separated or tag-style input for cities; matches common admin UX patterns |
| **Zone priority for overlap** | Simple integer priority avoids complex rule engines for MVP |

---

## Part 3: Files Summary

### New Files to Create (Returns)

| # | File | Purpose |
|---|------|---------|
| 1 | `components/ecommerce/orders/return-stat-cards.tsx` | KPI cards for returns |
| 2 | `components/ecommerce/orders/return-filters.tsx` | Return-specific filter bar |
| 3 | `components/ecommerce/orders/return-detail-panel.tsx` | Slide-over return detail |
| 4 | `components/ecommerce/orders/return-form.tsx` | Return creation/edit form |
| 5 | `services/ecommerceReturnService.ts` | Return API service with mock fallback |
| 6 | `types/ecommerce.ts` additions | `EcommerceReturn`, `EcommerceReturnItem`, `ReturnKPIs` interfaces |

### New Files to Create (Shipping)

| # | File | Purpose |
|---|------|---------|
| 1 | `components/ecommerce/orders/shipping-stat-cards.tsx` | KPI cards for shipping |
| 2 | `components/ecommerce/orders/zone-card.tsx` | Accordion-style zone card |
| 3 | `components/ecommerce/orders/zone-form.tsx` | Zone add/edit form |
| 4 | `components/ecommerce/orders/rate-form.tsx` | Shipping rate add/edit form |
| 5 | `components/ecommerce/orders/courier-form.tsx` | Courier add/edit form |
| 6 | `components/ecommerce/orders/shipping-settings-form.tsx` | Global shipping settings |
| 7 | `services/shippingZoneService.ts` | Zone/rate/courier API service with mock fallback |
| 8 | `types/ecommerce.ts` additions | `ShippingZone`, `ShippingRate`, `Courier`, `ShippingKPIs` |

### Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `app/(protected)/ecommerce/orders/returns/page.tsx` | Full rewrite with stat cards, filters, DataTable, detail panel |
| 2 | `app/(protected)/ecommerce/orders/shipping-zones/page.tsx` | Full rewrite with tabs, zone accordions, couriers, settings |
| 3 | `types/ecommerce.ts` | Add return and shipping interfaces |
| 4 | `services/index.ts` | Add `ecommerceReturnService` and `shippingZoneService` exports |

### Files Already Existing (reusable)

| File | Purpose |
|------|---------|
| `services/shippingMethodService.ts` | Existing — can be kept for simpler use cases or merged into `shippingZoneService` |
| `types/ecommerce.ts` (ShippingMethod) | Existing type, used as base for expanded shipping types |

---

## Part 4: Implementation Order

| Step | What | Depends On |
|------|------|------------|
| 1 | Extended types for returns and shipping | Nothing |
| 2 | `ecommerceReturnService.ts` | Step 1 |
| 3 | `return-stat-cards.tsx` + `return-filters.tsx` | Step 1, 2 |
| 4 | Rewrite `returns/page.tsx` with DataTable + filters + stat cards | Steps 1-3 |
| 5 | `return-detail-panel.tsx` + `return-form.tsx` | Step 1, 2 |
| 6 | Wire return detail/edit into returns page | Steps 4, 5 |
| 7 | `shippingZoneService.ts` | Step 1 |
| 8 | `shipping-stat-cards.tsx` + `zone-card.tsx` + `zone-form.tsx` | Step 1, 7 |
| 9 | `rate-form.tsx` + `courier-form.tsx` + `shipping-settings-form.tsx` | Step 7 |
| 10 | Rewrite `shipping-zones/page.tsx` with 3 tabs | Steps 7-9 |
| 11 | Polish: loading states, empty states, error handling, mobile responsive | All |

---

## Part 5: Verification

1. Navigate to `/ecommerce/orders/returns` — verify stat cards render
2. Apply return status filter → table updates correctly
3. Click a pending return → detail panel opens with items, reason, timeline
4. Approve a return → confirmation dialog → status updates in table
5. Process refund → enter transaction ID → status changes to "refunded"
6. Reject a return → must provide reason → status changes to "rejected"
7. Navigate to `/ecommerce/orders/shipping-zones` — verify tabbed layout renders
8. Expand a zone accordion → cities and rates show correctly
9. Add a new rate to a zone → inline form → saves and appears
10. Switch to Couriers tab → table renders with toggle/edit actions
11. Toggle courier active/inactive → status badge updates
12. Switch to Settings tab → form saves global threshold
13. Test empty state: filter with no matches → empty state message
14. Test loading: skeleton shimmer for all components
15. Test dark mode: all components render correctly
16. Test mobile: responsive layout, stacked zones instead of accordion
