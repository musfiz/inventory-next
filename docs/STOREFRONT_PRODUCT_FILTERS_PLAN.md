# Storefront Product Filter Sidebar — Implementation Plan

## Goal
Add a working, standard left-side filter sidebar to **every** storefront product-listing page (`/store/products`, `/store/category/[slug]`, `/store/search`) that actually filters the product list from the server (not just the currently-loaded page), plus fill in missing standard e-commerce facets (rating, real price range, in-stock).

## Current State (audit)
| Page | Sidebar? | Filters | Problem |
|---|---|---|---|
| `store/products` | ✅ | Category, Price (steps), Brand, In-stock | Filters only apply to the 8/16/24... products already loaded client-side — doesn't search the whole catalog |
| `store/category/[slug]` | ❌ none | sort only | No sidebar at all |
| `store/search` | ⚠️ partial | Category, Brand (mock data) | Brands are hardcoded mock data; filters apply only to the first 60 fetched results |

Backend (`StorefrontCatalogService`) already supports `min_price`, `max_price`, `in_stock` — but the controller never reads them from the request. There's no rating data wired up at all (`rating` is hardcoded to `0` in the API response) and no multi-value support for `category_id`/`brand_id`.

## Backend Changes (`inventory-api`)
1. **`app/Services/StorefrontCatalogService.php`**
   - `category_id` / `brand_id` filters accept an array (`whereIn`) in addition to a single int.
   - Add a review-aggregate subquery (`product_reviews`, `status = approved`, scoped by tenant) joined to expose `avg_rating` / `reviews_count` per product.
   - Add `min_rating` filter using the aggregated `avg_rating`.
2. **`app/Http/Controllers/Api/Storefront/StorefrontCatalogController.php`**
   - Parse `category_id`, `brand_id` as comma-separated lists → arrays.
   - Read `min_price`, `max_price`, `in_stock`, `min_rating` from the request into `$filters`.
   - `mapProduct()` uses the real aggregated `avg_rating` / `reviews_count` instead of hardcoded `0`.

## Frontend Changes (`inventory-ui`)
1. **`services/storefrontService.ts`** — extend `getProducts()` params: `category_id`/`brand_id` can be `string` (comma list), add `min_price`, `max_price`, `in_stock`, `min_rating`.
2. **New shared component** `components/storefront/ProductFilterSidebar.tsx`
   - Exports `PRICE_STEPS`, `RATING_STEPS` constants.
   - `ProductFilterFields` — the actual filter controls (Category tree, Price steps, Rating, Brand list, In-stock checkbox, Clear-all button), fully prop-driven so it can be reused by all 3 pages.
   - `FilterSidebar` — desktop sticky `<aside>` wrapper.
   - `FilterDrawer` — mobile slide-over wrapper (backdrop + slide-in panel + "Show N results" button).
3. **`app/(storefront)/store/products/page.tsx`**
   - Add rating filter state.
   - Replace the "filter what's already loaded" logic with a server refetch whenever any filter/sort changes (reset to page 1), so filtering covers the entire catalog.
   - Use the new shared `FilterSidebar` / `FilterDrawer` components.
4. **`app/(storefront)/store/category/[categorySlug]/page.tsx`**
   - Add a left sidebar (Brand, Price, Rating, In-stock — category itself is already the page's scope, so the existing subcategory chips stay as-is instead of duplicating a category checkbox list).
   - Fetch real brand list via `storefrontService.getBrands()`.
   - Wire filters to the server request (`category_id` = current category, plus selected filters).
5. **`app/(storefront)/store/search/page.tsx`**
   - Replace mock `BRANDS` with real brands from the API.
   - Add Price/Rating/In-stock sections to the existing sidebar.
   - Move category/brand/price/rating/stock filtering server-side instead of filtering the fixed 60-item batch client-side.

## Out of scope
- Attribute (size/color) faceted filtering — not enough backend/API support to do this reliably in this pass.
- Price range slider UI (keep the existing preset-steps pattern for consistency; wired to real `min_price`/`max_price` now).
