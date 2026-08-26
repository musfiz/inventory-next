# Storefront Analytics — Sales & Conversion Page — UI/UX Implementation Plan

## Context

The **Storefront Analytics** menu in the admin sidebar (`components/layout/sidebar.tsx`, lines 345–353) currently links three pages:

- **Sales & Conversion** → `/ecommerce/analytics/sales`
- **Traffic & Search Terms** → `/ecommerce/analytics/traffic`
- **Top Products** → `/ecommerce/analytics/top-products`

All three are currently `PageStub` placeholders. The Sales & Conversion stub (`app/(protected)/ecommerce/analytics/sales/page.tsx`) advertises four features:

1. **Orders & Revenue Trend** — chart of order volume and revenue over time (daily/weekly/monthly).
2. **Conversion Rate** — storefront conversion (orders ÷ visitors).
3. **Cart Abandonment** — abandonment rate and recovery trends.
4. **Period Comparison** — current period vs. previous period.

This plan delivers a production-grade analytics page that replaces the stub, **plus the backend API** it depends on in `inventory-api`. It follows the established report architecture: `ReportLayout` + `ReportSummaryCards` + `ReportChart` (Recharts) + `ReportTable` + `ReportExportBar` + `ReportFilters`, the `reportService` service layer, and the Laravel `ReportController → Trait::staticMethod` pattern with `Cache::remember` and tenant scoping.

The page is **tenant-aware**: super admins see a `TenantSelect`; tenant users are auto-scoped to their `tenant_id`.

---

## Data Reality Check (what exists today)

| Concept | Backend State | Notes |
|---------|--------------|-------|
| Ecommerce orders | ✅ `ecommerce_orders` + `ecommerce_order_items`, tenant-scoped | Revenue, order count, AOV derivable directly |
| Cart / checkout events | ❌ No table | Needs new `storefront_analytics_events` table |
| Visitors / page views | ❌ No table | Needs new `storefront_analytics_events` table (or store in same table) |
| Wishlist signals | ✅ `wishlists` table | Already used by `WishlistTrait` for conversion proxy |
| KPI endpoint | ✅ `EcommerceOrderController@kpis` | Returns order/revenue KPIs (no conversion/abandonment) |

**Decision:** Conversion rate and cart abandonment require *funnel* data that does not yet exist. We will introduce a lightweight `storefront_analytics_events` table (visitor sessions, cart adds, checkout starts, purchases) to power the funnel. This is the same storefront-telemetry foundation the Traffic & Search Terms page will reuse, so we build it once here.

---

## Phase 1 — Backend: Migration & Model (inventory-api)

### Step 1 — Migration: `storefront_analytics_events`
- File: `database/migrations/2026_08_25_000001_create_storefront_analytics_events_table.php`
- Schema:
  - `id`, `tenant_id` (FK→tenants), `event_type` (`visitor` | `cart_add` | `checkout_start` | `purchase`)
  - `session_id` (string, nullable) — groups a visitor journey
  - `customer_id` (FK→customers, nullable) — known only after login/purchase
  - `product_id` (FK→products, nullable) — for cart_add
  - `order_id` (FK→ecommerce_orders, nullable) — for purchase
  - `source` (string, nullable) — utm/referrer bucket
  - `amount` (decimal 12,2, nullable) — order grand_total for purchase events
  - `created_at`, `updated_at`
  - Indexes: `tenant_id`, `event_type`, `created_at`, composite `(tenant_id, event_type, created_at)`

### Step 2 — Model: `StorefrontAnalyticsEvent`
- File: `app/Models/StorefrontAnalyticsEvent.php`
- `use HasTenantScope` for auto tenant scoping
- Fillable: `tenant_id`, `event_type`, `session_id`, `customer_id`, `product_id`, `order_id`, `source`, `amount`
- Relationships: `belongsTo(Customer)`, `belongsTo(Product)`, `belongsTo(EcommerceOrder)`, `belongsTo(Tenant)`
- Casts: `amount => decimal:2`

### Step 3 — Analytics trait: `StorefrontAnalyticsTrait`
- File: `app/Traits/StorefrontAnalyticsTrait.php`
- Reuses the helper pattern from `ReportTrait` (`reportTenantId()`, `dateRange()`, `remember()`).
- Methods:
  - `getSalesConversionAnalytics(array $params)` → returns `['data', 'summary', 'params']` where:
    - `summary` = KPI block (below)
    - `data` = daily/weekly/monthly time-series rows for the trend chart
  - `getFunnelBreakdown(array $params)` → visitor → cart_add → checkout_start → purchase counts + rates
  - `getCartAbandonment(array $params)` → abandoned carts, abandonment rate, recovered count
  - `getPeriodComparison(array $params)` → current vs previous period deltas
  - `getSalesConversionTable(array $params)` → detailed rows for the data table

**KPI summary shape:**
```php
'summary' => [
  'total_revenue'        => (float),
  'total_orders'         => (int),
  'avg_order_value'      => (float),
  'conversion_rate'      => (float),   // purchases / visitors * 100
  'cart_abandonment_rate'=> (float),   // (cart_add - purchase_sessions) / cart_add * 100
  'visitors'             => (int),
  'carts_created'        => (int),
  'checkouts_started'    => (int),
  'revenue_delta_pct'    => (float),   // vs previous period
  'orders_delta_pct'     => (float),
  'conversion_delta_pct' => (float),
],
```

**Time-series row shape (`data`):**
```php
[
  'date'          => '2026-08-01',
  'revenue'       => (float),
  'orders'        => (int),
  'visitors'      => (int),
  'conversion_rate'=> (float),
  'avg_order_value'=> (float),
]
```

**Funnel shape (`funnel`):**
```php
[
  ['stage' => 'Visitors',     'count' => (int)],
  ['stage' => 'Added to Cart', 'count' => (int)],
  ['stage' => 'Checkout',      'count' => (int)],
  ['stage' => 'Purchased',     'count' => (int)],
]
```

Cache via `Cache::remember("storefront-analytics:".tenantId.":".md5(json_encode($params)), 300, fn)`.

### Step 4 — Controller: `StorefrontAnalyticsController`
- File: `app/Http/Controllers/Api/Ecommerce/StorefrontAnalyticsController.php`
- Thin controller using `StorefrontAnalyticsTrait`, mirroring `WishlistController`:
  - `GET analytics` → `getSalesConversionAnalytics()` → `success(['data' => …, 'summary' => …, 'funnel' => …])`
  - `GET analytics/table` → `getSalesConversionTable()` → `paginated(...)`
  - `GET analytics/export` → delegates to `ReportExportService` (reuse existing export infra)

### Step 5 — Routes
- File: `routes/route/ecommerce.php` (inside the `auth:sanctum` group), add:
  ```php
  Route::prefix('ecommerce/analytics')->group(function () {
      Route::get('/',            [StorefrontAnalyticsController::class, 'analytics']);
      Route::get('/table',       [StorefrontAnalyticsController::class, 'table']);
      Route::get('/export',      [StorefrontAnalyticsController::class, 'export']);
  });
  ```
- Permission gate: `permission:view-storefront-sales-conversion` (reuse the `view-*-report` permission convention).

---

## Phase 2 — Frontend: Service & Types (inventory-ui)

### Step 6 — Types (`types/ecommerce.ts`)
Add:
```typescript
export interface SalesConversionSummary {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  conversion_rate: number;
  cart_abandonment_rate: number;
  visitors: number;
  carts_created: number;
  checkouts_started: number;
  revenue_delta_pct: number;
  orders_delta_pct: number;
  conversion_delta_pct: number;
}

export interface SalesConversionTrendPoint {
  date: string;
  revenue: number;
  orders: number;
  visitors: number;
  conversion_rate: number;
  avg_order_value: number;
}

export interface FunnelStage {
  stage: 'Visitors' | 'Added to Cart' | 'Checkout' | 'Purchased';
  count: number;
}

export interface SalesConversionTableRow {
  date: string;
  orders: number;
  revenue: number;
  visitors: number;
  conversion_rate: number;
  avg_order_value: number;
  cart_abandonment_rate: number;
}

export interface SalesConversionResponse {
  data: SalesConversionTrendPoint[];
  summary: SalesConversionSummary;
  funnel: FunnelStage[];
}
```

### Step 7 — Service (`services/storefrontAnalyticsService.ts`)
- Follows the exact pattern of `services/reportService.ts` methods (Axios via `apiClient`, `tenant_id` splice for super admin).
- Methods:
  - `getSalesConversion(params)` → `SalesConversionResponse`
  - `getTable(params)` → `GenericReportResponse<SalesConversionTableRow>`
  - `export(format, params)` → blob download
- Params: `{ start_date, end_date, period: 'daily'|'weekly'|'monthly', tenant_id? }`

### Step 8 — Register export in `services/index.ts`
```typescript
export { default as storefrontAnalyticsService } from './storefrontAnalyticsService';
```

---

## Phase 3 — Frontend: Page UI/UX (inventory-ui)

### Step 9 — Replace the stub page
- File: `app/(protected)/ecommerce/analytics/sales/page.tsx`

**Layout (top → bottom), reusing the report component library:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [TrendingUp icon] Sales & Conversion        [Export PDF/Excel/CSV]  │
│  Storefront sales performance & funnel                       [Print] │
├─────────────────────────────────────────────────────────────────────┤
│  Filters: [Tenant*] [Start Date] [End Date] [Period ▾]  [Apply][Reset]│
├─────────────────────────────────────────────────────────────────────┤
│  KPI Cards (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4):             │
│  [Total Revenue] [Orders] [Conversion Rate] [Avg Order Value]        │
│  [Cart Abandonment] [Visitors] [Carts Created] [Checkouts Started]   │
├─────────────────────────────────────────────────────────────────────┤
│  Orders & Revenue Trend  — ReportChart (area, x=date,               │
│    series=[revenue (currency), orders (number)])                    │
├─────────────────────────────────────────────────────────────────────┤
│  Two-column on lg:                                                    │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Conversion Funnel    │  │ Cart Abandonment                     │ │
│  │ (horizontal bars or  │  │  - Abandonment rate big stat         │ │
│  │  ReportChart donut / │  │  - Abandoned vs Recovered (bar)      │ │
│  │  custom funnel)      │  │  - Recovery trend (line)             │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Period Comparison — small delta chips (▲/▼ %) on each KPI card      │
├─────────────────────────────────────────────────────────────────────┤
│  Detailed Table (ReportTable, paginated 25):                        │
│  Date | Orders | Revenue | Visitors | Conv % | AOV | Abandon %     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component usage (copy from `reports/sales/sales-trend/page.tsx`):**
- `ReportLayout` with `title="Sales & Conversion"`, `icon={TrendingUp}`, `loading`, `error`, `hasData`, `printRef`/`printId`.
- `ReportFilters` with `onApply={generate}` / `onReset={reset}` / `loading`.
  - `{isSuperAdmin && <FilterField label="Tenant"><TenantSelect/></FilterField>}`
  - `CustomDatePicker` for start/end (defaults: `firstDayOfMonthISO()` → `todayISO()`).
  - Period `<select>` (daily/weekly/monthly).
- `ReportSummaryCards` fed by `cards` derived from `summary`. Each card shows a delta chip from `*_delta_pct` (green ▲ / red ▼).
- `ReportChart type="area"` for the trend (revenue + orders), `format="currency"` / `number`.
- Custom **Funnel** section: render `funnel` stages as horizontal progress bars (width = count / maxCount), with conversion % between stages. Reuse `ReportChart type="donut"` as an alternative compact view.
- `ReportChart type="bar"` for abandoned vs recovered.
- `ReportTable` with `columns` mapped to `SalesConversionTableRow`.
- `ReportExportBar` wired to `exportToPDF` / `exportColumnsToExcel` / `exportColumnsToCSV` / `printReport`, `disabled={!data}`.

**UX details:**
- Empty state: `ReportEmptyState` when no events/orders in range (e.g., brand-new tenant) — message: "No storefront activity in this period yet."
- Loading: full-height spinner via `ReportLayout`.
- Mobile: KPI cards stack 1-col; filter row wraps; charts full-width; table scrolls horizontally.
- Print: `printRef` wraps KPI + charts + table so exports look clean (`.no-print` hides filters/export bar).
- Color coding consistent with `ReportSummaryCards` `COLOR_MAP` (green=revenue, blue=orders, purple=conversion, red=abandonment, amber=visitors).

### Step 10 — Sidebar (no change required)
The nav item already exists at `sidebar.tsx:349`. Optionally add `permission: 'view-storefront-sales-conversion'` to the item so it respects the new permission gate.

---

## Verification (end-to-end)

### Backend
1. Run migration: `php artisan migrate` (creates `storefront_analytics_events`).
2. Seed a few events (visitor/cart_add/checkout_start/purchase) for a tenant via tinker or a test factory.
3. Hit `GET /api/v1/ecommerce/analytics?start_date=...&end_date=...` with a Sanctum token → confirm `summary`, `data`, `funnel` shapes.
4. Confirm tenant scoping: a non-super-admin user only sees their `tenant_id` data; super admin passing `tenant_id` is honored.
5. Confirm caching: second call within 300s is fast (cache hit) and reflects no DB queries for the aggregate.
6. Confirm `GET /api/v1/ecommerce/analytics/table` paginates and `export?format=csv` returns a file.

### Frontend
1. `npm run dev` → navigate to `/ecommerce/analytics/sales`.
2. Confirm stub is replaced; KPI cards, trend chart, funnel, abandonment, comparison, and table render with seeded data.
3. Toggle period (daily/weekly/monthly) → chart x-bucket changes.
4. As super admin: change `TenantSelect` → data re-scopes. As tenant user: tenant select hidden, data auto-scoped.
5. Export PDF / Excel / CSV / Print → files generated and contain the table.
6. Empty period → `ReportEmptyState` shows; no crash.
7. `npm run lint` and `npm run build` pass.

---

## Files Summary

**inventory-api (new):**
- `database/migrations/2026_08_25_000001_create_storefront_analytics_events_table.php`
- `app/Models/StorefrontAnalyticsEvent.php`
- `app/Traits/StorefrontAnalyticsTrait.php`
- `app/Http/Controllers/Api/Ecommerce/StorefrontAnalyticsController.php`
- Route additions in `routes/route/ecommerce.php`

**inventory-ui (new):**
- `services/storefrontAnalyticsService.ts`
- Type additions in `types/ecommerce.ts`
- Export registration in `services/index.ts`

**inventory-ui (modified):**
- `app/(protected)/ecommerce/analytics/sales/page.tsx` (stub → full page)

**docs (new):**
- `docs/STOREFRONT_SALES_CONVERSION_UI_UX_PLAN.md` (this file)
