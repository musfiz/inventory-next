# Storefront Orders — UI/UX Implementation Plan

## Overview

Overhaul the existing orders section into an industry-standard order management suite covering **All Orders** (list + detail) and **Order Status** (workflow board + timeline). The current implementation at `orders/page.tsx` is functional but minimal — a flat table with a basic modal. This plan delivers a professional-grade order management experience with real-time status tracking, rich order detail views, KPI summaries, bulk actions, and a visual status workflow board.

---

## Phase 1: Type System & Service Layer Enhancements

### 1.1 Extended Order Types (`types/ecommerce.ts`)

Add new interfaces while preserving existing ones:

```typescript
// ── Extended order detail types ─────────────────────────────────────────

export interface OrderStatusHistory {
  status: EcommerceOrder['status'];
  timestamp: string;
  note?: string;
  updated_by?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount?: number;
  total: number;
}

export interface OrderPayment {
  id: string;
  method: string;
  transaction_id?: string;
  amount: number;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  paid_at?: string;
}

export interface OrderTimeline {
  status: EcommerceOrder['status'];
  label: string;
  timestamp: string | null;        // null = pending/future step
  is_completed: boolean;
  is_current: boolean;
  note?: string;
}

export interface OrderDetail extends EcommerceOrder {
  items: OrderItem[];
  payments: OrderPayment[];
  status_history: OrderStatusHistory[];
  timeline: OrderTimeline[];
  notes?: string;
  gift_message?: string;
  is_gift?: boolean;
  billing_address?: string;
  delivery_instructions?: string;
  /** Estimated delivery date */
  estimated_delivery?: string;
}

// ── Dashboard / KPI types ─────────────────────────────────────────────

export interface OrderKPIs {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  processing_orders: number;
  shipped_today: number;
  delivered_today: number;
  cancelled_orders: number;
  returned_orders: number;
  average_order_value: number;
  orders_by_status: { status: string; count: number; percentage: number }[];
  revenue_today: number;
  revenue_this_month: number;
  revenue_last_month: number;
}

// ── Bulk action types ─────────────────────────────────────────────────

export type BulkActionType = 'update_status' | 'print' | 'export_csv' | 'export_pdf';

export interface BulkActionResult {
  success: number;
  failed: number;
  errors?: { id: string; error: string }[];
}

// ── Status workflow config ────────────────────────────────────────────

export interface StatusTransition {
  from: EcommerceOrder['status'];
  to: EcommerceOrder['status'];
  label: string;
  requires_tracking?: boolean;
  requires_note?: boolean;
  requires_payment?: boolean;
}

export interface StatusConfig {
  status: EcommerceOrder['status'];
  label: string;
  icon: string;
  color: string;               // Tailwind color class
  order: number;               // Position in the workflow
  description: string;
  allowed_transitions: StatusTransition[];
  requires_tracking?: boolean;
  auto_notify?: boolean;
}
```

### 1.2 Enhanced Service (`services/ecommerceOrderService.ts`)

Augment the existing `EcommerceOrderService` class (no breaking changes):

| Method | Returns | Notes |
|--------|---------|-------|
| `list(params)` | `{data, total, page, per_page}` | Existing — add date range filter params |
| `getById(id)` | `OrderDetail \| undefined` | Enhance to return full detail with items, payments, timeline |
| `updateStatus(id, status, note?)` | `void` | Existing — add optional note param |
| `updatePaymentStatus(id, status)` | `void` | Existing |
| `updateTracking(id, tracking, courier)` | `void` | Existing |
| `getKPIs()` | `OrderKPIs` | **New** — dashboard KPI data |
| `getTimeline(id)` | `OrderTimeline[]` | **New** — order status timeline |
| `bulkAction(ids, action, payload?)` | `BulkActionResult` | **New** — bulk status updates, export |
| `deleteOrder(id)` | `void` | **New** — soft delete/cancel with reason |
| `addNote(id, note)` | `void` | **New** — internal order note |
| `getStatusConfig()` | `StatusConfig[]` | **New** — workflow status configuration |

**Mock data expansion:**
- Add 15-20 mock orders covering all 7 statuses (placed → confirmed → packed → shipped → delivered / cancelled / returned)
- Include multiple payment methods (bkash, nagad, credit_card, cash_on_delivery)
- Vary amounts, dates, and shipping methods
- Each mock order gets 1-5 mock line items with realistic product names
- Add payment records per order
- Generate plausible status histories

---

## Phase 2: Shared Components (`components/ecommerce/orders/`)

Create the following reusable components:

### 2.1 `order-stat-cards.tsx` — KPI Summary Cards

```
OrderStatCards
├── Total Orders card       (indigo)    — count + ৳ revenue
├── Pending / Processing    (amber)     — orders needing attention
├── Shipped Today           (blue)      — in-transit count
└── Delivered Today         (green)     — completed count
```

**Props:** `kpis: OrderKPIs | null`, `loading?: boolean`
**States:**
- **Loading:** 4 skeleton shimmer cards (matching dimensions, animate-pulse)
- **Loaded:** Number with icon, delta indicator (↑↓ vs yesterday), formatted currency
- **Empty/Zero:** Grayed-out zero values with same layout
- **Error:** Cards render with "—" values and a subtle red border on error state

**Layout:** `grid grid-cols-2 md:grid-cols-4 gap-3`

Each card shows:
```
┌─────────────────────────────────────┐
│  [Icon]  Label                       │
│         ↑ 12% vs yesterday          │
│    1,234        ৳ 45,678           │
│    orders       revenue             │
└─────────────────────────────────────┘
```

### 2.2 `order-filters.tsx` — Advanced Filter Bar

A compact but powerful filter strip below the page header, collapsible on mobile.

**Filters:**
- **Date Range:** Preset dropdown (Today, Yesterday, Last 7 Days, This Month, Last Month, Custom) + date picker for custom range
- **Order Status:** Multi-select checkboxes (default: all except cancelled)
- **Payment Status:** Single-select dropdown
- **Payment Method:** Single-select dropdown
- **Search:** Text input (searches order #, customer name, email, phone)

**Props:** `filters: OrderFilterState`, `onChange: (filters) => void`, `onReset: () => void`
**States:**
- **Default:** All statuses selected, last 30 days date range, no search
- **Active filters:** Show active filter count badge on the filter button
- **Mobile:** Collapses to a summary bar with "Filters (3)" badge; expands inline

**Layout:** Responsive — wraps on smaller screens; on desktop forms a single row with inline groups.

### 2.3 `order-table.tsx` — Enhanced Order DataTable

Extends the base `DataTable` with order-specific column renderers and inline actions.

**Columns:**

| Column | Width | Render |
|--------|-------|--------|
| `☐` | 3% | Checkbox for bulk selection |
| `#` | 4% | Serial number (pagination-aware) |
| `Order #` | 11% | Monospace link, clickable → detail view; Courier icon + order number |
| `Customer` | 14% | Avatar initial + name + email (two-line) |
| `Items` | 4% | Count badge |
| `Total` | 8% | Bold ৳ amount |
| `Status` | 10% | Color-coded pill badge with icon |
| `Payment` | 8% | Small badge (paid/pending/failed/refunded) |
| `Date` | 8% | Relative time (e.g., "2h ago") + absolute on hover via tooltip |
| `Actions` | 8% | View, More (dropdown: update status, edit tracking, cancel) |

**States:**
- **Loading:** DataTable skeleton rows (10 shimmer rows matching column widths)
- **Empty (no orders):** Illustration + "No orders yet" + CTA button
- **Empty (filtered):** "No orders match your filters" + "Reset Filters" link
- **Error:** Inline error banner above table with retry button
- **Refreshing:** Subtle top-of-table progress bar (not full page reload)

**Bulk actions bar** (appears when ≥1 row selected):
- Fixed bar at bottom of table showing count: "3 orders selected"
- Actions: Update Status (dropdown), Print Invoice, Export CSV, Export PDF
- "Select All" checkbox in header with page-aware selection (current page vs all results)

**Row styling:**
- Hover highlight
- Status-conditional left border accent (thin colored strip on the left edge)
- Cancelled/returned rows have reduced opacity
- New/unread orders get a subtle blue dot indicator

### 2.4 `order-detail-panel.tsx` — Full-Screen Slide-Over Detail

Replaces the current basic modal. A right-side slide-over panel (drawer) at `z-50`.

**Layout:** `w-full max-w-3xl` with these sections (scrollable):

```
┌──────────────────────────────────────────────────┐
│ [← Back]  Order #ORD-2025-001    [Print] [More▾] │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐     │
│  │  STATUS TIMELINE                          │     │
│  │  [●] Placed       Dec 1, 10:30 AM        │     │
│  │  [●] Confirmed    Dec 1, 11:15 AM        │     │
│  │  [●] Packed       Dec 2, 09:00 AM        │     │
│  │  [○] Shipped      — Pending              │     │
│  │  [○] Delivered    — Pending              │     │
│  └──────────────────────────────────────────┘     │
│                                                  │
│  ┌─────────── ORDER INFO ───────────────────┐     │
│  │  Placed: Dec 1, 2025 at 10:30 AM         │     │
│  │  Payment: bKash (Paid)                   │     │
│  │  Status:  Packed                         │     │
│  └──────────────────────────────────────────┘     │
│                                                  │
│  ┌─── CUSTOMER ──────┴─── SHIPPING ─────────┐    │
│  │ Rahul Sharma         House 10, Road 3     │    │
│  │ rahul@example.com    Banani, Dhaka 1213   │    │
│  │ +880 1711-111111     Express via Pathao   │    │
│  │                      TRK-001-2025         │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌─── ORDER ITEMS ───────────────────────────┐   │
│  │  #  Product           Qty   Price   Total  │   │
│  │  1  Wireless HP       1    ৳2,500  ৳2,500 │   │
│  │  2  USB-C Cable 2m    2    ৳1,000  ৳2,000 │   │
│  │  3  Laptop Stand      1    ৳1,000  ৳1,000 │   │
│  │                        ─────────────────    │   │
│  │  Subtotal                      ৳4,500      │   │
│  │  Shipping                      ৳150        │   │
│  │  Tax                           ৳225        │   │
│  │  Total                         ৳4,875      │   │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌─── ACTIONS ──────────────────────────────┐    │
│  │  [Update Status ▾]  [Edit Tracking]       │    │
│  │  [Send Email]       [Cancel Order]        │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌─── NOTES ────────────────────────────────┐    │
│  │  [📝 Add internal note...]                │    │
│  │  • Dec 2 - Customer called about delivery │    │
│  │  • Dec 1 - Priority handling requested   │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

**States:**
- **Loading:** Skeleton layout matching the full panel structure (shimmer blocks for each section)
- **Loaded:** Full rich layout as above
- **Error:** Error message with retry close/open
- **404 (deleted/not found):** "Order not found" message with close button

**Status update flow** (within panel):
- Dropdown to change status
- On change: show confirmation dialog with optional note field
- If transitioning to Shipped: require tracking number + courier
- If transitioning to Cancelled: require cancellation reason (select + text)
- On success: optimistically update the timeline + refresh list

### 2.5 `order-timeline.tsx` — Visual Status Timeline

Reusable vertical timeline component used in the detail panel.

**Props:** `entries: OrderTimeline[]`
**Renders:** Vertical stepper with:
- Completed steps: green checkmark circles + timestamp + note
- Current step: pulsing blue dot + timestamp
- Future steps: gray empty circles (dashed lines between)
- "Jump to current" button if timeline is long
- Click on a completed step to expand notes/details for that transition

**Edge cases:**
- Single entry → show as single step with no connecting lines
- All completed → all green, show completion time
- Cancelled mid-flow → show red "X" at the cancelled step, fade out remaining future steps
- Returned after delivered → show extra branch after delivered

### 2.6 `order-status-board.tsx` — Kanban-Style Status Board

For the Order Status page — a visual drag-and-drop board.

**Layout:** Horizontal scrollable kanban board with columns per status:

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
│ PLACED  │ │CONFIRM. │ │ PACKED  │ │ SHIPPED │ │DELIVERED │
│  (3)    │ │  (2)    │ │  (1)    │ │  (2)    │ │  (5)     │
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├──────────┤
│ ORD-004 │ │ ORD-003 │ │ ORD-005 │ │ ORD-002 │ │ ORD-001  │
│ Sneha   │ │ Amit    │ │ Vikram  │ │ Priya   │ │ Rahul    │
│ ৳8,455  │ │ ৳3,460  │ │ ৳1,360  │ │ ৳2,375  │ │ ৳4,875  │
│─────────│ │─────────│ │─────────│ │─────────│ │──────────│
│ 22 Dec  │ │ 18 Dec  │ │ 23 Dec  │ │ 10 Dec  │ │ 1 Dec    │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘
... collapsed on mobile into a single-column scrollable list with status tabs
```

**States:**
- **Loading:** 6-7 skeleton column outlines with shimmer card placeholders
- **Empty:** "No orders in this status" within each column — or a single empty state across all columns if no orders exist yet
- **All orders in one column:** Column expands naturally; others show empty state
- **Drag disabled (no permission):** Cards show without drag handle, cursor default

**Props:** `orders: EcommerceOrder[]`, `onStatusChange: (orderId, newStatus) => void`, `loading?: boolean`, `compact?: boolean`

**Interaction:**
- Drag card from one column to another to update status
- Click card → opens `OrderDetailPanel`
- Column header shows count badge
- Max height with inner scroll per column
- Search/filter within board mode

---

## Phase 3: All Orders Page — Full Rewrite

**File:** `app/(protected)/ecommerce/orders/page.tsx`

### Page Layout (top to bottom):

```
┌──────────────────────────────────────────────────────┐
│  📋 All Orders          [Export ▾] [Refresh]         │  ← Header
├──────────────────────────────────────────────────────┤
│  ┌─── Order Stat Cards (4-column grid) ──────────┐   │
│  │ Total Orders  Pending  Shipped Today  Deliv.  │   │  ← KPI Cards
│  │ 1,247          23       45             18      │   │
│  └───────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│  [Filters...]                              [Search]  │  ← Filter Bar
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐     │
│  │ Bulk Bar (conditional)                       │     │  ← Bulk Actions
│  │ "3 selected" [Update Status ▾] [Export ▾]   │     │
│  └─────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────┐     │
│  │ DataTable / Order Table                      │     │  ← Order List
│  │ [☐] [#] [Order] [Customer] [Items] [Total]  │     │
│  │ ...rows...                                   │     │
│  │ [Pagination]                        [N/Page] │     │
│  └─────────────────────────────────────────────┘     │
├──────────────────────────────────────────────────────┤
│  30s auto-refresh indicator — "Auto-refreshing..."   │  ← Footer
│  Last updated: 2 seconds ago                         │
└──────────────────────────────────────────────────────┘

← Order Detail Panel (slide-over, opens on row click)
```

### Component Hierarchy:

```
OrdersPage
├── PageHeader (title + Export button + Refresh button)
├── OrderStatCards (4 KPI cards)
├── OrderFilters (filter bar)
├── BulkActionBar (conditional on selection)
├── OrderTable (enhanced DataTable)
└── OrderDetailPanel (slide-over drawer)
```

### Key Interactions:

| Action | Behavior |
|--------|----------|
| **View order** | Row click → slide-over detail panel (right side) |
| **Update status from table** | Action dropdown → confirm dialog → optimistic update |
| **Bulk status update** | Select rows → bulk bar → status dropdown → confirm with note |
| **Export** | Dropdown: CSV / PDF / Printable view |
| **Refresh** | Manual refresh button + 30s auto-refresh (toggleable) |
| **Date range filter** | Presets + custom, updates query params |
| **Search** | Debounced 300ms, searches order #, customer name, email |
| **Pagination** | Client-side pagination via `DataTable`, page size selector (15/25/50/100) |

### States Summary:

| Page State | Visual |
|------------|--------|
| **Initial load** | Skeleton KPI cards (4 shimmer rectangles) + skeleton table (10 rows of shimmer) |
| **Loaded** | Full rendered layout with live data |
| **Empty (no orders at all)** | KPI cards show 0s; table shows illustration with "No orders yet" + styled empty state |
| **Empty (filtered)** | KPI cards show 0s for filtered data; table shows "No orders match your criteria" + Reset Filters link; subtle difference from absolute-empty |
| **Error (data fetch failed)** | Error banner above table with "Failed to load orders" + Retry button; KPI cards show dashed values |
| **Error (single action)** | Toast notification for the failed action; no page-level disruption |
| **Refreshing** | Thin animated progress bar at top of table area (not full-page spinner) |
| **Real-time update** | New order toast notification when auto-refresh detects a new order since last poll |

### Edge Cases:

| Scenario | Handling |
|----------|----------|
| Order cancelled mid-fulfillment | Timeline shows red stop at cancelled step; remaining steps grayed out |
| Payment failed after order placed | Payment status badge shows "Failed"; action button to retry payment |
| Partial delivery | Items table shows delivered quantity vs ordered quantity per line |
| Order with no items (shouldn't happen) | Graceful: show "0 items" badge with warning icon, allow notes entry |
| Duplicate order numbers | Use unique `id` for internal tracking; display `order_number` as-is |
| Very long customer name | Truncate with tooltip on hover |
| Tracking number update | Separate field in detail panel with validation (not required for non-shipped statuses) |
| Browser tab hidden / throttled | Auto-refresh pauses when tab is hidden; resumes on visibility change (Page Visibility API) |
| Concurrent status updates | Last-write-wins; no optimistic lock (acceptable for MVP; add version check later) |

---

## Phase 4: Order Status Page — Full Implementation

**File:** `app/(protected)/ecommerce/orders/status/page.tsx`

### Page Concept

A dual-purpose page:
1. **Visual Workflow Board** — Kanban-style drag-and-drop board showing all orders grouped by status
2. **Status Configuration** — Admin panel for workflow rules and transitions

### Layout:

```
┌──────────────────────────────────────────────────────────┐
│  📋 Order Status Workflow    [Board View] [Config View]  │  ← Tabs
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─── Board View (default) ─────────────────────────────┐ │
│  │                                                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────┐       │ │
│  │  │ PLACED   │ │CONFIRMED │ │PACKED│ │SHIPPD│  →→→   │ │
│  │  │ ● ORD-7  │ │ ● ORD-3  │ │      │ │      │       │ │
│  │  │ ● ORD-9  │ │          │ │      │ │      │       │ │
│  │  └──────────┘ └──────────┘ └──────┘ └──────┘       │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─── Config View ──────────────────────────────────────┐ │
│  │  Status Flow Configuration                           │ │
│  │                                                      │ │
│  │  Placed ──→ Confirmed ──→ Packed ──→ Shipped ──→     │ │
│  │               ↓                        ↓              │ │
│  │            Cancelled              Returned            │ │
│  │                                                      │ │
│  │  [Per-status settings panel]                        │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Board View (default tab):

- **Horizontal kanban board** with 7 columns (one per status)
- Cards show: order number, customer name, total, item count, time since order
- Color-coded column headers matching status colors
- Column counts with badges
- Drag-and-drop between allowed transitions (disallowed transitions show visual feedback + tooltip)
- Click card → opens `OrderDetailPanel`
- Quick-actions on card hover: View, Status change dropdown
- Search bar above board to filter cards across all columns
- Collapsed columns for Cancelled/Returned (expandable)

### Config View:

- **Visual workflow diagram** showing allowed status transitions as a directed graph
- Node editor: Click a status node to edit its config (label, color, description, icon)
- Edge editor: Click a transition arrow to toggle it on/off
- Per-status settings:
  - Auto-notify customer on transition (toggle)
  - Require tracking number before transition (toggle)
  - Require note on transition (toggle)
  - Default SLA/target hours for this status
- Reset to defaults button
- Changes are persisted via service (local mock for now)

### Timeline Component (shared):

Reusable vertical timeline (`order-timeline.tsx`) used in:
- Order detail panel (Phase 2.5)
- Status page per-order popover

### Component Hierarchy:

```
OrderStatusPage
├── PageHeader (title + tab toggle)
├── Tab: Board View
│   ├── SearchBar (filter across all columns)
│   ├── StatusBoard (kanban)
│   │   └── StatusColumn × N
│   │       └── OrderCard × N
│   └── OrderDetailPanel (slide-over on card click)
└── Tab: Config View
    ├── WorkflowDiagram (visual transition graph)
    ├── StatusEditor (per-status settings)
    └── TransitionEditor (edge toggles)
```

### States Summary:

| State | Board View | Config View |
|-------|-----------|-------------|
| **Loading** | Skeleton columns with shimmer cards | Skeleton workflow diagram |
| **Loaded** | Full kanban with cards | Interactive graph + editors |
| **Empty (no orders)** | All columns show "No orders" | Config still renders with default statuses |
| **Empty (searched)** | "No orders match" across columns with clear search button | N/A |
| **Error (load failed)** | Error banner with retry | Error message with retry |
| **Drag in progress** | Visual ghost card + column highlight on hover | N/A |
| **Disallowed drag** | Shake animation + "Cannot move from X to Y" tooltip | N/A |
| **Update succeeded** | Card moves to new column, toast "Status updated" | Toast "Config saved" |
| **Update failed** | Card returns to original column, toast error | Toast + field-level error |
| **Mobile** | Collapses to single column with tab selector for status group | Simplified list view |

### Edge Cases:

| Scenario | Handling |
|----------|----------|
| Order already in target status | Drop is rejected; no-op |
| Attempt to skip status (e.g., Placed → Shipped) | Config validation rejects if not an allowed direct transition; show tooltip "Must be Confirmed and Packed first" |
| Drag cancelled/returned orders | Card has reduced opacity; drop onto cancelled/returned column only (can't move out) |
| Status deleted in config | Orders in that status default to the previous valid status; confirmation required |
| Very long order list in one column | Column gets `max-h-[calc(100vh-300px)]` with inner scroll; virtualized if >50 cards |
| Slow drag on touch devices | 300ms long-press delay to distinguish from scroll; visual haptic feedback |
| Config changes affecting existing orders | Warning: "5 orders currently in 'Packed' status — changes apply to new transitions only" |

---

## Phase 5: Files Summary

### New Files to Create:

| # | File | Purpose |
|---|------|---------|
| 1 | `components/ecommerce/orders/order-stat-cards.tsx` | KPI summary cards |
| 2 | `components/ecommerce/orders/order-filters.tsx` | Advanced filter bar |
| 3 | `components/ecommerce/orders/order-table.tsx` | Enhanced order DataTable with bulk select |
| 4 | `components/ecommerce/orders/order-detail-panel.tsx` | Slide-over order detail drawer |
| 5 | `components/ecommerce/orders/order-timeline.tsx` | Vertical status timeline |
| 6 | `components/ecommerce/orders/order-status-board.tsx` | Kanban status board |
| 7 | `components/ecommerce/orders/order-card.tsx` | Individual order card for the board |
| 8 | `components/ecommerce/orders/order-bulk-actions.tsx` | Bulk action bar |
| 9 | `components/ecommerce/orders/status-workflow-diagram.tsx` | Visual workflow graph for config tab |
| 10 | `components/ecommerce/orders/status-editor.tsx` | Per-status config editor |

### Files to Modify:

| # | File | Change |
|---|------|--------|
| 1 | `types/ecommerce.ts` | Add all new interfaces (OrderItem, OrderDetail, OrderKPIs, OrderTimeline, StatusConfig, BulkActionType, etc.) |
| 2 | `services/ecommerceOrderService.ts` | Expand with new methods, richer mock data, date range filtering |
| 3 | `app/(protected)/ecommerce/orders/page.tsx` | Full rewrite with stat cards, filters, bulk actions, detail panel |
| 4 | `app/(protected)/ecommerce/orders/status/page.tsx` | Full rewrite with kanban board + config tab |
| 5 | `services/index.ts` | No change needed (already exports `ecommerceOrderService`) |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Slide-over drawer** instead of modal for detail | Matches industry standard (Shopify, Amazon, AdminLTE); preserves table context; allows wider content layout |
| **Kanban board** for status page | Visual workflow is more intuitive than dropdown-based status management; drag-and-drop is the expected UX for order pipelines |
| **Horizontal scroll** for board columns | 7 status columns won't fit on screen; horizontal scroll with sticky first column is the established kanban pattern |
| **Client-side KPI computation** | KPI values derived from loaded order data; avoids additional API calls for simple aggregates; real-time accurate within current dataset |
| **30s auto-refresh** | Balances real-time feel with API load; uses `setInterval` with Page Visibility API pause |
| **Bulk action bar anchored at bottom** | Always visible when selections exist; doesn't interfere with table header; mimics email client patterns |
| **Skeleton shimmer for loading** | Perceived performance improvement over spinner; gives user a sense of the layout before data arrives |
| **Optimistic status updates** | UI updates immediately; reverts on API failure — feels instant while remaining safe |
| **Config view separate from board view** | Separation of operations (managing orders) from administration (configuring workflow); reduces cognitive load on operational users |
| **Status-conditional left border on table rows** | Visual affordance for quickly scanning order states in a dense table |

---

## Data Flow

```
OrdersPage
  │
  ├── useEffect on mount + every 30s
  │   └── ecommerceOrderService.list(filters) ──→ mock/API
  │       └── response → setOrders, setKPIs(computed)
  │
  ├── OrderStatCards ← kpis (from computed orders data)
  │
  ├── OrderFilters ← filterState → onChange → re-fetch
  │
  ├── OrderTable ← orders, bulkSelection
  │   ├── onRowClick → setSelectedOrder → OrderDetailPanel
  │   └── onBulkSelect → BulkActionBar
  │
  ├── BulkActionBar ← selection, onAction → service.bulkAction
  │
  └── OrderDetailPanel ← selectedOrder (full detail)
      ├── orderId → ecommerceOrderService.getById(id) → OrderDetail
      ├── OrderTimeline ← detail.timeline
      ├── Items table ← detail.items
      ├── onStatusChange → service.updateStatus + optimistic update
      ├── onTrackingUpdate → service.updateTracking + optimistic update
      └── onNoteAdd → service.addNote + refresh detail

OrderStatusPage
  │
  ├── Board View (default tab)
  │   ├── ecommerceOrderService.list() → groupBy(status) → columns
  │   ├── onDragEnd → validate transition → service.updateStatus
  │   ├── onCardClick → setSelectedOrder → OrderDetailPanel
  │   └── SearchBar → filter cards across all columns
  │
  └── Config View
      ├── ecommerceOrderService.getStatusConfig() → render graph
      ├── onSave → service.saveStatusConfig() → persist locally
      └── Reset defaults → reload original config
```

---

## Implementation Order

The recommended build sequence (each step is independently testable):

| Step | What | Depends On |
|------|------|------------|
| 1 | Extended types in `types/ecommerce.ts` | Nothing |
| 2 | Enhanced service + mock data in `ecommerceOrderService.ts` | Step 1 |
| 3 | `order-timeline.tsx` component | Step 1 |
| 4 | `order-stat-cards.tsx` component | Step 1, 2 |
| 5 | `order-filters.tsx` component | Step 1 |
| 6 | Rewrite `orders/page.tsx` with steps 3-5 + DataTable | Steps 1-5 |
| 7 | `order-detail-panel.tsx` component | Step 1, 2, 3 |
| 8 | Wire detail panel into orders page | Step 6, 7 |
| 9 | `order-card.tsx` + `order-status-board.tsx` components | Step 1, 2 |
| 10 | `status-workflow-diagram.tsx` + `status-editor.tsx` | Step 1 |
| 11 | Rewrite `orders/status/page.tsx` with steps 9-10 | Steps 9, 10 |
| 12 | `order-table.tsx` + `order-bulk-actions.tsx` (extract from page) | Step 6 |
| 13 | Polish: auto-refresh, Page Visibility, animations, mobile responsive | All |

---

## Verification

1. Navigate to `/ecommerce/orders` — verify KPI cards render with correctly formatted numbers
2. Verify filter bar: apply status filter → table updates; apply date range → table updates; clear all → full list
3. Verify search: type order number → single result; type partial customer name → filtered results
4. Verify pagination: page 2 shows next set; page size selector works (15/25/50/100)
5. Click an order row → slide-over panel opens with correct data
6. Verify timeline in panel shows correct steps with current step highlighted
7. Change order status in panel → confirm dialog → list updates, badge changes color
8. Select multiple rows → bulk action bar appears → bulk status change works
9. Toggle to Order Status page → kanban board renders grouped by status
10. Drag an order card to an allowed status column → status updates + toast
11. Drag an order card to a disallowed column → rejection feedback
12. Switch to Config tab → workflow diagram renders → edit a status label → save → verify label updates on board
13. Test empty state: filter to a status with no orders → verify empty state message
14. Test loading state: add artificial delay → verify skeleton shimmer renders
15. Test error state: break the service → verify error banner with retry
16. Test mobile viewport (375px): verify responsive layout, collapsible filters, single-column board
17. Verify dark mode: all components render correctly with dark backgrounds
18. Verify keyboard navigation: Tab through filter controls, Enter to open detail, Escape to close panel
