# Plan: Wishlist Insights Admin Page

## TL;DR
Build a professional admin "Wishlist Insights" page at `/ecommerce/customers/wishlist-insights` under the "Store Customers" parent menu. This requires: backend API (migration, model, controller, trait), frontend service, types, and a full-featured analytics/insights page replacing the current PageStub. The page will provide actionable ecommerce intelligence — most wishlisted products, customer wishlist activity, conversion tracking, and trends.

---

## Phase 1: Backend Foundation

### Step 1 — Migration: Create `wishlists` table
- File: `database/migrations/2026_07_27_000001_create_wishlists_table.php`
- Schema:
  - `id`, `tenant_id` (FK→tenants), `customer_id` (FK→customers), `product_id` (FK→products)
  - `created_at`, `updated_at`
  - UNIQUE constraint on `[tenant_id, customer_id, product_id]`
  - Indexes on `tenant_id`, `customer_id`, `product_id`

### Step 2 — Model: `Wishlist`
- File: `app/Models/Wishlist.php`
- Use `HasTenantScope` trait for auto tenant scoping
- Relationships: `belongsTo(Customer)`, `belongsTo(Product)`, `belongsTo(Tenant)`
- Fillable: `tenant_id`, `customer_id`, `product_id`

### Step 3 — Trait: `WishlistTrait`
- File: `app/Traits/WishlistTrait.php`
- Methods:
  - `getWishlistInsights(array $params)` — aggregated stats for admin
  - `getMostWishlistedProducts(int $limit, ?string $period)` — top N products by wishlist count
  - `getWishlistTrends(string $period)` — daily/weekly/monthly trend data
  - `getCustomerWishlistActivity(array $params)` — per-customer wishlist details
  - `toggleWishlistItem(int $customerId, int $productId)` — add/remove
  - `getCustomerWishlist(int $customerId)` — for storefront account page

### Step 4 — Controller: `WishlistController` (Admin)
- File: `app/Http/Controllers/Api/Ecommerce/WishlistController.php`
- Endpoints:
  - `GET  /api/v1/ecommerce/wishlists/insights` — dashboard stats (totals, trends, top products)
  - `GET  /api/v1/ecommerce/wishlists/top-products` — most wishlisted products paginated
  - `GET  /api/v1/ecommerce/wishlists/trends` — time-series data
  - `GET  /api/v1/ecommerce/wishlists/customers` — customer activity list
  - `GET  /api/v1/ecommerce/wishlists/customers/{id}` — single customer wishlist items

### Step 5 — Controller: `StorefrontWishlistController` (Storefront)
- File: `app/Http/Controllers/Api/Storefront/WishlistController.php`
- Endpoints:
  - `GET  /api/v1/storefront/account/wishlist` — authenticated customer's wishlist
  - `POST /api/v1/storefront/wishlist/toggle` — toggle product in wishlist

### Step 6 — Routes
- File: `routes/route/ecommerce.php` — admin routes (authenticated + tenant)
- File: `routes/route/storefront.php` — storefront routes (customer auth)

---

## Phase 2: Frontend Service & Types

### Step 7 — Types (*parallel with Step 8*)
- File: `types/ecommerce.ts` — add:
  ```typescript
  WishlistInsightStats { total_wishlisted_products, total_wishlist_items, total_customers_with_wishlists, avg_items_per_customer, conversion_rate }
  WishlistTopProduct { product_id, product_name, product_image, sku, price, wishlist_count, added_to_cart_count, purchased_count }
  WishlistTrendPoint { date, count }
  WishlistCustomerActivity { customer_id, customer_name, customer_email, items_count, last_added_at }
  WishlistItem { id, product_id, product_name, product_image, sku, price, stock_status, added_at }
  ```

### Step 8 — Service (*parallel with Step 7*)
- File: `services/wishlistInsightsService.ts`
- Methods:
  - `getInsights(params?)` → stats + summary
  - `getTopProducts(params?)` → paginated list
  - `getTrends(params?)` → time-series array
  - `getCustomerActivity(params?)` → paginated customer list
  - `getCustomerWishlist(customerId)` → items array

---

## Phase 3: Wishlist Insights Page UI

### Step 9 — Replace PageStub with Full Page
- File: `app/(protected)/ecommerce/customers/wishlist-insights/page.tsx`

**Page Layout (top to bottom):**

1. **Header Row**
   - Title: "Wishlist Insights" with Heart icon
   - Period filter: dropdown (Last 7 days / 30 days / 90 days / All time)
   - Export button (CSV)

2. **KPI Stat Cards** (4 cards in a row)
   - Total Wishlisted Products (unique products)
   - Total Wishlist Items (all entries)
   - Customers with Wishlists (unique customers)
   - Wishlist → Purchase Conversion Rate (%)

3. **Trend Chart Section**
   - Simple bar/line chart (using lightweight chart or CSS bars)
   - Shows wishlist additions over time (grouped by day/week)
   - Responsive: stacks on mobile

4. **Most Wishlisted Products Table** (DataTable)
   - Columns: #, Product (image+name), SKU, Price, Wishlist Count, Stock Status, Actions
   - Actions: View Product
   - Sortable by wishlist_count
   - Search by product name

5. **Customer Wishlist Activity Table** (DataTable)
   - Columns: #, Customer (avatar+name), Email, Items in Wishlist, Last Added, Actions
   - Actions: View Wishlist (opens slide-over/modal with product list)
   - Search by customer name/email
   - Paginated

6. **Customer Wishlist Detail Modal**
   - Triggered by "View Wishlist" action
   - Shows customer name, total items
   - Table: Product image, Name, SKU, Price, Stock Status, Date Added
   - Close button

---

## Relevant Files

**Backend (to create/modify):**
- `database/migrations/2026_07_27_000001_create_wishlists_table.php` — new migration
- `app/Models/Wishlist.php` — new model
- `app/Traits/WishlistTrait.php` — new trait with all business logic
- `app/Http/Controllers/Api/Ecommerce/WishlistController.php` — new admin controller
- `app/Http/Controllers/Api/Storefront/WishlistController.php` — new storefront controller
- `routes/route/ecommerce.php` — add admin wishlist routes
- `routes/route/storefront.php` — add storefront wishlist routes

**Frontend (to create/modify):**
- `types/ecommerce.ts` — add wishlist type interfaces
- `services/wishlistInsightsService.ts` — new service
- `app/(protected)/ecommerce/customers/wishlist-insights/page.tsx` — replace stub with full page

**Existing (reference only, no changes):**
- `stores/wishlist-store.ts` — storefront client-side store (will be enhanced later to sync with API)
- `components/layout/sidebar.tsx` — already has menu entry (no change needed)

---

## Verification

1. Run `php artisan migrate` — wishlists table created without errors
2. Seed test data: create 20-30 wishlist entries with variety of products/customers
3. Hit `GET /api/v1/ecommerce/wishlists/insights` — returns stats JSON
4. Hit `GET /api/v1/ecommerce/wishlists/top-products` — paginated product list
5. Hit `GET /api/v1/ecommerce/wishlists/trends?period=30d` — time-series data
6. Navigate to `/ecommerce/customers/wishlist-insights` — page loads with stat cards
7. Search/sort in "Most Wishlisted" table works
8. "View Wishlist" modal opens with customer's products
9. Period filter changes reflected in stats and trends
10. Empty state renders gracefully when no wishlist data exists
11. Super admin sees data across tenants; tenant admin sees own tenant data only

---

## Decisions
- **No chart library dependency** — use CSS-based bar chart (consistent with existing dashboard patterns, no bundle bloat)
- **Conversion rate** — calculated as (products purchased that were also wishlisted / total wishlisted products) × 100
- **Storefront sync** — the existing localStorage wishlist store will be enhanced separately (out of scope for this plan) to POST to `/storefront/wishlist/toggle` when user is authenticated
- **Tenant scoping** — `HasTenantScope` trait handles automatic tenant filtering; super admin bypasses with optional `tenant_id` param
- **Excluded**: Wishlist notifications, price-drop alerts, "back in stock" alerts (future features)

---

## Further Considerations

1. **Trend chart approach**: Use pure CSS percentage bars (like dashboard revenue chart) vs. a lightweight chart lib like `recharts`. Recommendation: CSS bars for v1 — simpler, no dependency.
2. **Export format**: CSV only for now, or also PDF? Recommendation: CSV only matches existing export patterns (e.g., stock export).
3. **Real-time storefront sync**: Should we include updating the storefront wishlist page to use API instead of localStorage in this plan? Recommendation: Separate follow-up — keep this plan focused on admin insights.
