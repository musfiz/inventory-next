# UIMS E‑Commerce Storefront — Complete Implementation Plan

> **For:** Inventory Management System (UIMS)
> **Stack:** `inventory-api` (Laravel 12 multi‑tenant API) · `inventory-ui` (Next.js 15 · Tailwind v4 · React Query)
> **Audience:** Tech lead, backend & frontend engineers, product owner, QA.
> **Date:** July 2026
> **Principles:** Mobile‑first · Intentional minimalism · Conversion‑focused · Frictionless navigation
> **Status:** Plan only — no implementation until decisions (§N) confirmed.

---

## 0. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER / MOBILE CLIENT                       │
│  inventory-ui/app/(storefront)  ·  Next.js 15 · Tailwind v4 · RQ     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS  (X-Tenant header / subdomain)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       inventory-api  (Laravel 12)                    │
│  Route::prefix('storefront')  ·  Sanctum 'customer' guard           │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Catalog    │  │  Checkout  │  │ Account  │  │  Reviews /  │   │
│  │  Service    │  │  Service    │  │ Service  │  │  Wishlist   │   │
│  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  └──────┬──────┘   │
│         │                │              │               │           │
│         ▼                ▼              ▼               ▼           │
│  products · categories · brands · product_variations · attribute_* │
│  stocks · customers · sales_orders · sales_order_items · payments   │
│  product_reviews (NEW) · coupons (NEW) · wishlists (NEW)            │
│  tenant_settings.storefront_* (JSON keys)                          │
│                                                                      │
│  stancl/tenancy  →  automatic tenant_id scoping                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principles**
- **Separate guard** `customer` so shoppers never collide with `tenant_admin` / `tenant_user`.
- **Separate controllers** `App\Http\Controllers\Api\Storefront\*` reading the same models as admin but with a storefront scope + dedicated API Resources (no `cost_price` / `tenant_id` / internal flags leaked).
- **Mocks stay** — `lib/storefront/mock-data.ts` becomes a dev fallback behind `NEXT_PUBLIC_USE_MOCK`, not deleted.
- **Mobile‑first** — every page designed at 360px first, then enhanced for desktop.

### Current Storefront State (already scaffolded in `inventory-ui`)

```
inventory-ui/
├── app/(storefront)/
│   ├── layout.tsx            → Header + Footer + CartDrawer shell
│   ├── page.tsx              → redirects to /store
│   └── store/
│       ├── page.tsx          → Home (hero, flash sale, categories, sections)
│       ├── products/[productSlug]/page.tsx     → PDP (stub)
│       ├── category/[categorySlug]/page.tsx    → PLP (stub)
│       ├── brand/[brandSlug]/page.tsx          → Brand PLP (stub)
│       ├── search/page.tsx                      → Search results
│       ├── cart/page.tsx                        → Full cart page
│       ├── checkout/page.tsx + success/         → Checkout
│       ├── login/ register/                     → Customer auth
│       └── account/  orders  wishlist  addresses  settings
├── components/storefront/
│   ├── StorefrontHeader.tsx   → sticky + mega menu + search w/ autocomplete
│   ├── StorefrontFooter.tsx
│   ├── CartDrawer.tsx         → slide‑out mini cart
│   ├── ProductCard.tsx        → hover, wishlist, quick‑add
│   ├── ProductCardSkeleton.tsx
│   ├── Badge.tsx  Rating.tsx  ScrollToTop.tsx
├── stores/  cart-store  wishlist-store  customer-auth-store
├── types/storefront.ts        → full domain types
└── lib/storefront/mock-data.ts → 16 products, categories, brands, reviews, orders, coupons
```

**Gap:** Everything reads from `mock-data.ts`. No integration with `inventory-api`. PDP / PLP / cart / checkout / account pages are stubs. No backend storefront endpoints exist.

---

## Phase A — Backend: Storefront API Surface (inventory-api)

### A1. Routes (all tenant‑scoped, public cacheable, throttled)

```php
Route::prefix('storefront')->middleware(['throttle:60,1', 'tenant.resolve'])->group(function () {
    // Catalog (public)
    Route::get ('home',                         StorefrontHomeController@index);
    Route::get ('categories',                    CategoryController@index);          // tree
    Route::get ('categories/{slug}',            CategoryController@show);            // + facet config
    Route::get ('brands',                       BrandController@index);
    Route::get ('brands/{slug}',                BrandController@show);
    Route::get ('products',                      ProductController@index);           // paginated + all filters
    Route::get ('products/{slug}',              ProductController@show);
    Route::get ('search',                       SearchController@index);
    Route::get ('search/suggest',               SearchController@suggest);
    Route::get ('products/{slug}/reviews',      ReviewController@index);

    // Cart / checkout (public, but order belongs to guest or authed customer)
    Route::post('cart/validate',                CartController@validate);
    Route::post('checkout/quote',               CheckoutController@quote);
    Route::post('checkout/place',               CheckoutController@place);
    Route::get ('orders/{uuid}',                OrderController@show);
    Route::get ('orders/{uuid}/track',          OrderController@track);
    Route::get ('payments/{uuid}/receipt',      PaymentController@receipt);          // PDF

    // Coupons
    Route::post('coupons/validate',             CouponController@validate);

    // Customer auth (Sanctum 'customer')
    Route::post('auth/register',                AuthController@register);
    Route::post('auth/login',                   AuthController@login);
    Route::post('auth/logout',                  AuthController@logout);
    Route::get ('auth/me',                       AuthController@me);

    // Authed customer
    Route::middleware('auth:customer')->group(function () {
        Route::get ('account/orders',               AccountController@orders);
        Route::get ('account/orders/{uuid}',       AccountController@order);
        Route::get ('account/addresses',           AccountController@addresses);
        Route::post('account/addresses',            AccountController@storeAddress);
        Route::put ('account/addresses/{id}',       AccountController@updateAddress);
        Route::delete('account/addresses/{id}',    AccountController@deleteAddress);
        Route::get ('account/wishlist',             WishlistController@index);
        Route::post('wishlist/toggle',              WishlistController@toggle);
        Route::apiResource('account/reviews',       ReviewController::class)->only(['store','destroy']);
    });
});
```

### A2. New Migrations

| Migration | Purpose | Docs gap |
|---|---|---|
| `add_is_visible_on_storefront_to_products` | boolean default 0 — admin opts products into store | Required |
| `add_storefront_auth_fields_to_customers` | `password`, `email_verified_at`, `last_login_at` | Required for shopper login |
| `create_product_reviews_table` | rating, title, body, images JSON, is_verified_purchase, is_approved, helpful_count, admin_response | Docs §8 noted absent |
| `create_wishlists_table` | customer_id, product_id, unique(customer_id, product_id) | New |
| `create_coupons_table` + `coupon_products` | code, type, value, min_order, max_discount, starts_at, ends_at, usage_limit, per_customer_limit, used_count | Docs §8 promotion engine gap |
| `create_coupon_redemptions_table` | coupon_id, customer_id (nullable for guest), sales_order_id, amount_discounted | Audit trail |
| `add_storefront_keys_to_tenant_settings` | seed: `storefront_hero`, `storefront_promo_banners`, `storefront_trust_badges`, `storefront_free_shipping_threshold`, `storefront_return_days`, `storefront_default_payment_methods` | Configurable per tenant |

### A3. Guard & Config

- `config/auth.php`: add guard `customer` with provider `customers` (model `App\Models\Customer`), `sanctum` token guard.
- `Customer` model: add `HasApiTokens`, `Notifiable`; ensure `password` is hashed via cast.
- Middleware `tenant.resolve`: reads `X-Tenant` header (dev) or subdomain (prod) and initializes `tenancy()` so the storefront queries the right tenant.

### A4. Storefront Scope

```php
// App\Models\Scopes\StorefrontScope
query->where('status', 'active')->where('is_visible_on_storefront', true);
```

Apply to `Product` and `ProductVariation`. A product with `track_inventory=false` still resolves; `available_quantity` = `quantity - reserved_quantity` (already computed in docs §6). Out‑of‑stock still surfaced but not buyable unless `allow_backorder`.

### A5. API Resources (serializer whitelist — no leaks)

```
StorefrontProductResource
StorefrontProductVariationResource
StorefrontCategoryResource
StorefrontBrandResource
StorefrontReviewResource
StorefrontOrderResource
```

Strip: `cost_price`, `tenant_id`, `low_stock_threshold`, `display_order`, `custom_fields` (unless tenant opts in), `reserved_quantity`.

### A6. Search Backend

- Use existing `products.name` + trigram on `sku` / `barcode` + tags.
- For high‑SKU tenants, later swap to Laravel Scout + Meilisearch (Meilisearch supports typo tolerance, synonyms, faceting) — out of scope for v1 but pluggable.

### A7. Caching

- `/home`, `/categories`, `/brands` cached 5 min per tenant (`Cache::tags(['storefront', "tenant:{$id}"])`).
- Invalidate via model observer: when product / category / brand mutated, flush tag.
- Product detail cached 10 min keyed by slug.

### A8. Indexes (performance, docs §8)

```sql
CREATE INDEX products_storefront_idx        ON products (tenant_id, status, is_visible_on_storefront, category_id);
CREATE INDEX stocks_warehouse_variation_idx ON stocks  (tenant_id, warehouse_id, variation_id);
CREATE INDEX sales_orders_customer_uuid_idx ON sales_orders (tenant_id, customer_id, uuid);
CREATE INDEX product_reviews_product_idx     ON product_reviews (tenant_id, product_id, is_approved, created_at);
```

---

## Phase B — Frontend: Data Layer (inventory-ui)

### B1. New Packages

```
@tanstack/react-query   # catalog caching, prefetch, infinite PLP
zustand persist         # cart/wishlist (already present — wire persisted storage)
```

Add a provider in `app/(storefront)/layout.tsx`: `<QueryClientProvider>`.

### B2. Services (replace mock-data imports)

```
services/storefront/
  catalogService.ts      getHome, getCategories, getCategoryBySlug, getBrands,
                         getProducts, getProductBySlug, search, suggest
  cartService.ts         validateCart, getQuote
  checkoutService.ts     placeOrder, getOrder, trackOrder
  customerService.ts     register, login, logout, me, getOrders, getOrder,
                         getAddresses, saveAddress, deleteAddress
  wishlistService.ts     getWishlist, toggleWishlist
  reviewService.ts       listReviews, addReview
  couponService.ts       validateCoupon
```

Each uses a new `lib/api/storefront-axios.ts` (separate from admin axios) with:
- `baseURL = process.env.NEXT_PUBLIC_BACKEND_URL + '/storefront'`
- header `X-Tenant: <tenantId>` from `process.env.NEXT_PUBLIC_TENANT_ID` (dev) or `subdomain` parser (prod).
- Interceptor: attach customer Sanctum token from `customer-auth-store`.

### B3. React Query Keys / Prefetch Strategy

| Key | Prefetch trigger |
|---|---|
| `['home']` | on `/store` mount |
| `['categories']` | on layout mount (used by header + footer) |
| `['products', filters]` | on PLP mount; **prefetch next page** on scroll |
| `['product', slug]` | on ProductCard `onMouseEnter` |
| `['search-suggest', q]` | debounced 250 ms |
| `['reviews', slug, page]` | on PDP mount |

### B4. Mock Fallback

`NEXT_PUBLIC_USE_MOCK` defaults to `true`. Services branch:

```ts
if (USE_MOCK) return mockProduct(slug);
return api.get(`/products/${slug}`).then(r => r.data.data);
```

Keeps the storefront runnable without the backend during local dev / storybook.

### B5. Types

Extend `types/storefront.ts` to match resources:
- Add `availableStock`, `isVisibleOnStorefront`, `breadcrumb`, `relatedProducts`, `facetConfig`, `review[]` shape with images, `orderTimeline`, `couponApplied`.
- Remove anything that mirrored internal admin fields.

---

## Phase C — Header & Navigation (Requirement #1)

File: `components/storefront/StorefrontHeader.tsx` (already scaffolded; extend)

| Pattern | Current | Upgrade |
|---|---|---|
| Sticky header | ✅ exists | Add shrink animation on scroll past 120 px; collapse top utility bar. Keep logo + search + cart always visible. |
| Mega menus | ✅ exists against mock | Hydrate from `useQuery(['categories'])`; tier‑structured dropdowns; **featured column** on left with a hero promo image per parent; sub‑subcategories rendered as inline pill chips. |
| Persistent search autocomplete | partial (in‑memory) | Debounce 250 ms → `suggest()`; render product thumb + price + "View all results"; recent searches to `localStorage`; popular searches from tenant settings; keyboard arrow navigation through hits. |
| Synonym recognition | none | Backend trigram + later Meilisearch `synonyms` config (e.g., "iphone" → "smartphone"). |
| Mobile bottom tab nav | missing | Add for `lg:hidden`: Home, Categories, Search, Cart (badge), Account. Pill‑rounded floating bar above system nav. |
| Tenant brand bar | missing | Top thin strip showing tenant logo / name + business type tag (e.g., "Pharmacy"). Pulled from `/home`. |
| Locale / currency switcher | missing | Tenant default; can expose later. v1 just shows tenant's currency (BDT). |

### C1. Header States

- Default (not scrolled): full logo, expanded search, category nav row.
- Scrolled: compact logo, search collapses to icon, single‑row nav, cart icon only.
- Checkout pages: **minimal header** (logo + secure banner + return‑to‑cart) — see Phase G. Achieved by checking `usePathname().startsWith('/store/checkout')`.

### C2. Accessibility

- Mega menu: `aria-haspop` + `aria-expanded`; arrow keys browse; Escape closes.
- Search: input has `role="combobox"` + `aria-controls` to results list; option `aria-selected`.
- Cart count badge has `aria-label="N items in cart"`.

---

## Phase D — Homepage (Requirement #2)

File: `app/(storefront)/store/page.tsx` (rewrite from mock → API)

### D1. Hero Section

- Render hero config from tenant settings (`storefront_hero`): high‑impact lifestyle image, value proposition text, dominant CTA "Shop the Collection".
- **Single hero image** as per spec. Optionally client‑side crossfade between 2 heroes on a 12 s timer if tenant configures ≥ 2; otherwise static.
- Overlay gradient right‑to‑left (keeps image subject on right per photographic convention) with text card on left.
- Below hero: **thin promo strip** (animated marquee using existing `.sf-marquee`) — "Free shipping over ৳5,000 · 7‑day returns · 24/7 support".

### D2. Curated Grid (prevents decision fatigue)

Three sections, each max 8 products:
- **Bestsellers** — `is_featured=true` + `sales_count desc`.
- **New Arrivals** — `created_at desc`.
- **Trending in {businessType}** — derived from tenant business_type (e.g., pharmacy → top OTC; electronics → top gadgets; fashion → seasonal).

Each section: `ProductCard` grid + "View all" pill at right. Horizontal scroll on mobile (snap‑x), grid on desktop.

### D3. Category Carousel

- "Shop by Category" — top‑level categories with image + count + emoji fallback.
- 10 visible on desktop, swipe horizontal on mobile.

### D4. Flash Sale (conditional)

- Only show if tenant configured `storefront_flash_sale` (a product tag `flash-sale` + end timestamp) — already partially mocked.
- Countdown timer (existing component) + sale badges.

### D5. Trust Signals Strip

- `TrustStrip` component exists; pull strings from tenant settings, not hardcoded:
  - "Free shipping over {threshold}"
  - "{returnDays}‑day returns"
  - "Secure checkout"
  - "24/7 support"

### D6. Promo Banners

- 1 or 2 banner cards (`storefront_promo_banners`), hero‑style, link to category / products.

### D7. Recently Viewed

- Client‑side only: `localStorage` of last 8 visited product slugs. "Pick up where you left off" rail. (No backend.)

### D8. Newsletter / Tenant Contact

- Newsletter input (writes to tenant's `customers.email` as opt‑in — backend stores marketing opt‑in flag on customer). Plus contact phone / email from tenant settings.

### D9. SEO + Structured Data

- `metadata` API: title = "{tenant.name} — {tagline}", description; OG image = hero.
- JSON‑ld `Store` schema with catalog aggregation at minimum; add `ItemList` for each curated rail.

---

## Phase E — Category & Product Listing (Requirement #3)

Files:

```
app/(storefront)/store/category/[categorySlug]/page.tsx
app/(storefront)/store/brand/[brandSlug]/page.tsx
app/(storefront)/store/search/page.tsx
app/(storefront)/store/products/page.tsx          (NEW — all products index)
```

### E1. URL State — Faceted Filtering

All filters live in the query string (shareable, SSR‑friendly):

```
/category/electronics?price_min=100&price_max=2000&color=Red,Blue&brand=apple,samsung&rating_min=4&in_stock=1&sort=price_asc&page=2
```

Filters rendered dynamically from the category's `facetConfig` returned by backend:
- **Price range** — dual thumb slider (reuse `.sf-range` style).
- **Attributes** — `select` type → checkbox tree; `color` type → swatch grid; `size` type → chip group; `number` type → min / max.
- **Brand** — multi‑select with product count.
- **Rating** — selectable pills ("4★ & up").
- **Availability** — toggle "In stock only".
- **Tags** — if tenant uses product tagging, show as a section.
- **Active filter chips** above grid with ✕ to remove individual filters plus "Clear all".

Mobile: filters live in a sliding drawer (`.sf-slide-in-left`), bottom sheet style, "Show N results" CTA.

### E2. Product Grid

`ProductCard` already has hover, wishlist, quick‑add. **Upgrades**:
- **Hover alternate view** (spec #3): cross‑fade `images[1]` on `group-hover` when available; otherwise subtle zoom.
- **Quick add for variable products**: hover popover with size / color chips; selecting adds the right variation to cart (no PDP navigation required).
- **Wishlist**: gets `aria-pressed`, persists to backend if authed else localStorage.
- **Stock badge**: "Only N left" when `availableStock < lowStockThreshold`.

Grid: 2 cols mobile, 3 cols tablet, 4 cols desktop, 5 cols `xl`. Horizontal snap on mobile also available as a view mode. `ProductCardSkeleton` for loading states.

### E3. Toolbar

- Sort dropdown: Featured, Price: Low→High, Price: High→Low, Newest, Rating, Popularity. Drives `sort` URL param.
- View mode toggle (grid / list — `ProductCard variant="list"` already exists).
- Results count: "Showing 24 of 318 products".
- Desktop: sidebar left sticky 260 px; mobile: "Filters" button with drawer.

### E4. Pagination / Infinite Scroll

- React Query `useInfiniteQuery` with "Load more" button + IntersectionObserver sentinel.
- Cursor‑based if backend supports (`?cursor=`), else page numbers.
- Prefetch next page on hover / focus of "Load more".

### E5. SEO

- SSR the first page (Next route handler / server component) — `<head>` metadata from category, breadcrumb JSON‑ld `BreadcrumbList`, `CollectionPage`.
- H1 = category name; H2 = subcategory chips.

---

## Phase F — Product Detail Page (Requirement #4)

File: `app/(storefront)/store/products/[productSlug]/page.tsx` (rewrite stub)

### F1. Layout (above the fold)

Two‑column on desktop (gallery left, buy box right); stacked on mobile with sticky add‑to‑cart bar.

### F2. Image Gallery

- **Left vertical thumbnail stack** (desktop) or under‑main horizontal strip (mobile).
- **Main image**: zoom‑on‑hover — `transform-origin` follows cursor via `--x, --y` CSS vars; `scale(1.6)`. On touch: pinch‑zoom + swipe between images via a carousel component.
- Switching variation swaps the gallery image set (filter to that variation's images if `variation.image` set, else product images).
- LQIP blur‑up: `next/image` `placeholder="blur"` with generated blurDataURL (server side via `plaiceholder` or precomputed).
- Badges overlay (sale, new, bestseller) from `Badge`.

### F3. Right‑Hand Buy Box (visible without scrolling)

1. **Breadcrumb** `Home / Category / Subcategory` (text links, `text-xs`).
2. **Brand** — small uppercase brand link.
3. **Title** — largest font on page, `text-2xl sm:text-3xl font-bold`.
4. **Rating line** — ⭐ 4.8 (123 reviews) clickable → scrolls to reviews section.
5. **Price block** — big price + MRP strikethrough + "{N}% off" badge + "Save ৳120" line.
6. **Variation selectors**:
   - Color → swatches with hex_code from `attribute_values.color_code`.
   - Size → chip group with availability greying disabled options.
   - Other `select` attribute → dropdown.
   - When out of stock: "Notify me" link instead of add to cart.
7. **Quantity stepper** with min=1, max=`availableStock` (or unlimited if `track_inventory=false`).
8. **Stock / ETA** — "In stock · Get it by Wed Jul 16" computed from `estimatedDeliveryDays`.
9. **Primary CTA** "Add to Cart" (full width), **secondary** "Buy Now" (goes straight to checkout).
10. **Trust row** — secure checkout / returns / warranty icons.
11. **SKU / share** — small print row.

### F4. Below the Fold

- **Tabbed or accordion sections**:
  - Description (HTML from admin).
  - Specifications (render attributes as a definition list).
  - Shipping & Returns (boilerplate from tenant settings + product `estimatedDeliveryDays`).
  - Reviews (lazy mount, see F5).
- **Related products carousel** — `product_relations` `related`.
- **Cross‑sell carousel** — `product_relations` `cross_sell` "Frequently bought together".
- **Up‑sell carousel** — `product_relations` `up_sell`.

### F5. Reviews Widget

- Summary: average rating (large), distribution bars (5★..1★), count, "Write a review" CTA (authed + verified‑purchase only).
- List: avatar / name, verified badge, star rating, title, body, attached photos grid, date, helpful count ("Mark as helpful" increments client‑optimistic), admin response if present.
- Sort dropdown (Most recent / Highest / Lowest / Most helpful).
- Pagination or "Load more".
- **Add review form**: logged‑in customers only, product must be in their order history (`is_verified_purchase=true` enforced server side), star picker, title, body, photo upload (`intervention/image` already in deps).

### F6. Mobile Sticky Bar

Fixed bottom bar `lg:hidden` showing price, "Add to Cart", and "Buy Now" once the main CTA scrolls off.

### F7. SEO

- `metadata` from product: title `"{name} — {brand} | {tenant}"`, description = shortDescription, OG image = primary image.
- JSON‑ld `Product` with `offers[]` (one per variation), `aggregateRating`, `review[]` (first 10).

---

## Phase G — Cart & Mini Cart (Requirement #5)

Files:

- `components/storefront/CartDrawer.tsx` (slide‑out — already scaffolded)
- `app/(storefront)/store/cart/page.tsx` (full cart)
- `stores/cart-store.ts` (zustand — wire to persist + server sync)

### G1. Slide‑Out Mini Cart

- Open on add‑to‑cart (existing behavior) — overlay, not full page redirect.
- Header: "Your Bag ({count})", close ✕, "Continue shopping".
- Line items: image, name, variation attributes (pill chips), qty stepper, remove, unit price, line total. Editing qty here is instant; deleting with confirm.
- **Free‑shipping progress bar**: "You're ৳{remaining} away from free shipping — add ৳X more" with animated fill.
- Subtotal + "Calculated at checkout" footnote for shipping / tax.
- Empty state: friendly illustration + "Browse products" CTA.
- Authed customer: cart persisted server‑side (`/cart/validate` also saves); guest cart in localStorage; merge on login.

### G2. Full Cart Page

- Same fields as mini cart but larger, allows editing all lines, removing, adding coupon.
- Coupon input with `/coupons/validate` — success shows discount line + "Applied ✓" chip + remove.
- Order summary card on right: subtotal, discount, shipping estimate, tax (estimate), estimated total. Real values returned by `/checkout/quote` once address known.
- Suggested products carousel ("Don't forget these").
- "Proceed to Checkout" primary CTA.

### G3. Cart Integrity

On opening checkout, POST `/cart/validate`:
- Server re‑checks each `variation_id` exists, `availableStock >= qty`, price snapshot equals current `selling_price` (anti‑price‑shock).
- Stale items returned with `{ ok: false, reason }`; UI shows toast "Some items changed since you added them — review" and removes / updates lines.

---

## Phase H — Checkout (Requirement #5)

Files:

```
app/(storefront)/store/checkout/layout.tsx        → minimal layout override
app/(storefront)/store/checkout/page.tsx          → single-page accordion checkout
app/(storefront)/store/checkout/success/page.tsx  → confirmation
```

### H1. Distraction‑Free Layout

- `checkout/layout.tsx` renders **only** a slim header: tenant logo + "Secure Checkout 🔒" badge + back‑to‑cart link. No full nav, no mega menu, no footer, no cart drawer. Achieved by nested layout override of the storefront shell.
- Body has a centered max‑width 720 px column; left column form, right column sticky order summary.

### H2. Guest Checkout by Default

- Step 1 — **Contact**: email (or phone) + "Keep me logged in on this device" optional. If email matches an existing customer, prompt "Sign in for faster checkout" but never require it.
- Step 2 — **Shipping address**: form fields (name, phone, address1, address2, area, city, zip, country). If authed, show saved address picker + "Add new".
- Step 3 — **Shipping method**: radio cards (Standard / Express / Pickup) with rate + ETA. Selected updates quote live.
- Step 4 — **Payment method**:
  - bKash, Nagad, Rocket (BD mobile wallets) — their success URL pattern.
  - Card via SSLCommerz (existing IPN support suggested).
  - COD — city‑restricted (rule configurable per tenant).
  - Apple Pay / Google Pay — Phase I, not v1.
- Single‑page accordion (all sections expanded / collapsed together, modern pattern) instead of multi‑step wizard to reduce abandonment.

### H3. Place Order Flow

1. Front end collects steps 1–4 then calls `POST /checkout/place` with cart items + address + shipping + payment choice + coupon.
2. Backend inside one DB transaction:
   - Looks up / creates customer (guest) with email / phone.
   - Creates `sales_order` status `confirmed` (skipping draft), invoice number auto (`INV-SO-2607-00001` style already in admin flow).
   - Writes `sales_order_items` snapshotting `unit_price`, `cost_price` (closing docs gap S‑4), `tax_rate`.
   - Decrements stock via `StockMovementTrait` (sales movement, idempotent).
   - Redeems coupon (writes `coupon_redemptions`).
   - Creates `payment` row (`reference_type='sales'`, amount = grand_total, payment_method chosen, status `pending` until gateway IPN).
   - Auto‑journal via existing `AccountingService::postSalesOrderJournal` (idempotent).
3. Returns `{ order_uuid, invoice_number, grand_total, payment_redirect }`.
4. Front end redirects to payment gateway (if needed) or straight to `/checkout/success?o={uuid}`.

### H4. Success Page

- Big ✓ "Order placed" — invoice number, ETA, "We emailed a receipt to {email}".
- Order items + totals + shipping address block.
- **Action buttons**: "Download receipt (PDF)", "Track order", "Continue shopping", "Create account from this order" (if guest — offers to save the email + ask for password so they keep order history).
- Track timeline visual (vertical stepper) from `Order.timeline`.

### H5. Anti‑Abuse

- Idempotency key via `Idempotency-Key` header (docs §9 S‑21 gap on admin too — implement storefront first).
- 5 min expiry on `checkout/quote` results so cached quote ≠ order total.

---

## Phase I — Customer Account (Requirement #5)

Files under `app/(storefront)/store/account/**`

### I1. Accessibility & Auth

- `customer-auth-store` already present; wire to `/auth/*`.
- Account layout keeps storefront header / footer but adds a **left sidebar nav** on desktop and **top tab scroll** on mobile.

### I2. Pages

| Page | Content |
|---|---|
| `/account` (dashboard) | Greeting, profile summary, recent 3 orders, default address card, wishlist count, reward points (if later). |
| `/account/orders` | Table: invoice #, date, status badge, total, payment status, Actions (View, Track, Reorder, Return). Filter by status. Pagination. |
| `/account/orders/[uuid]` | Full timeline, items, invoice download (PDF via `/payments/{uuid}/receipt`), return request (CTA creates `sales_return` via existing backend), "Buy again" adds all items to cart. |
| `/account/addresses` | Grid of address cards, set default, edit, delete. Address form reused at checkout. |
| `/account/wishlist` | Grid of `ProductCard` with "Move to cart" / "Remove". |
| `/account/settings` | Profile (name, email, phone, password), notification prefs, marketing opt‑in, "Delete my account" (soft‑delete in tenant scope). |
| `/account/reviews` | List of my reviews with edit / delete options (within edit window, e.g., 30 days). |

### I3. Guest Conversion

"Create an account from your last order" — when guest completes checkout, success page offers this; backend links the email‑matched customer to the order history.

---

## Phase J — Cross‑Cutting Concerns

### J1. Mobile‑First Polish

- Bottom tab nav (Phase C).
- Touch‑friendly filter drawer (Phase E).
- Swipeable galleries (Phase F).
- Sticky add‑to‑cart bar on PDP (Phase F).
- Sticky filter toolbar on PLP scroll.
- Pull‑to‑refresh on home / orders (simulated, optional).

### J2. Performance

- `next/image` everywhere with explicit `sizes`; Unsplash placeholder now, swap to tenant CDN via `file_url` once admin uploads pipeline ready.
- React Query `staleTime`: catalog 60 s, product 5 min, cart / order 0 (always fresh).
- Route segment config:

  ```ts
  // app/(storefront)/store/products/[productSlug]/page.tsx
  export const revalidate = 60;
  export const dynamic = 'error'; // force dynamic when cart querystring present
  ```

- LCP target < 2.5 s on 3G for home page (hero image priority).
- Code‑split below‑the‑fold sections (`FlashSale`, `Reviews`, `Related`) with `next/dynamic` + SSG fallback.

### J3. Accessibility (WCAG 2.1 AA)

- Keyboard navigation: mega menu, filters, gallery, cart drawer, filter drawer, accordion checkout.
- Focus trap in CartDrawer + MobileMenu + filter drawer + modal.
- `aria-live` region for cart count and toast notifications.
- Color contrast: brand indigo on white passes; verify accent rose variants meet AA on dark surface.
- Reduced motion: respect `prefers-reduced-motion` for hero crossfade, marquee, hover zoom.

### J4. Internationalization

- Introduce `t()` wrapper (no full i18n library v1) — every string routes through it; default `en-BD`. Easy BN addition later by adding BN locale strings.
- Numbers / dates via `Intl.NumberFormat('en-IN', ...)` + `Intl.DateTimeFormat` (already used for money).

### J5. Analytics

- Semantic data attributes: `data-event`, `data-product-id`, `data-variation-id`, `data-list` used by a single global event listener emitting to dataLayer / posthog.
- Standard events: `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_payment_info`, `purchase`.
- Consent management: cookie banner (required for GDPR‑lite if operating in EU; v1 implement minimal "Accept cookies" gate).

### J6. Error States

- Per‑route `error.tsx` boundary: branded friendly error with retry button.
- `not-found.tsx` (storefront scoped) for unknown product / category.
- API 5xx fallback to cached / empty state with retry; never crash page.
- Cart validate mismatches: explicit "Some items changed" UI (G3).

### J7. Security

- Sanctum for both customer and admin guards; tokens never in localStorage long‑term (use httpOnly cookies where feasible; if SPA‑mode stick with token in `auth-storage`).
- CSRF: existing axios interceptor handles `419`.
- XSS: product description from admin should be sanitized server‑side (allow subset of tags via `Mews/Purifier` or strip); render with `dangerouslySetInnerHTML` only after sanitize.
- No secrets in client env; `NEXT_PUBLIC_*` only holds backend URL + tenant id.

### J8. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | cart math, coupon calc, address form validation, services (mock axios) |
| Component | Vitest + Testing Library | ProductCard, CartDrawer, BuyBox, Filters |
| E2E | Playwright | Home → PDP → add → cart → checkout (guest) → success; account login → place order; PLP filters URL round‑trip |
| Visual | Storybook (optional later) | ProductCard variants, states, dark mode |
| Load | k6 | /home 200 RPS, /products filters 50 RPS per tenant |
| Backend | Pest (already used) | storefront endpoint contract tests, multi‑tenant scoping, stock decrement on place, coupon redemption edge cases |

---

## Phase K — Admin (UIMS) Storefront Touchpoints

For each tenant, the admin panel already lets staff manage products; we need **store‑specific** toggles in the existing product editor:

1. **"Sell on storefront" toggle** → sets `is_visible_on_storefront`.
2. **"Featured / New / Bestseller / On Sale" flags** (some already exist via `is_featured`; mock has `isNew` / `isBestseller` — add columns to products if absent).
3. **Storefront pricing** → reuse `selling_price`, `mrp` on `product_variations`. No separate storefront price list v1.
4. **Estimated delivery days** → new `products.estimated_delivery_days` (or variation override).
5. **Product relations** → already have `product_relations` table (related / cross_sell / up_sell / bundle). Add UI in admin to manage.
6. **Promotions / coupons** → new admin section to create coupons (replaces mock `COUPONS`).
7. **Hero / promo banners / trust badges** → keys in `tenant_settings` editable in admin "Storefront Settings" page.
8. **Reviews moderation** → queue listing `product_reviews` pending approval; approve / reject / respond.

This Phase K surfaces itself as admin work items, separated from the storefront consumer UX, so the two UX tracks don't blur (intentional minimalism for shoppers; power‑user surfaces for staff).

---

## Phase L — Rollout / Sprints

| Sprint | Backend (inventory-api) | Frontend (inventory-ui) |
|---|---|---|
| **1** | Storefront route group, guard, schema (migrations A2), `home` + `categories` + `products` + `product-by-slug` endpoints, resources, scopes | React Query provider, services B2, type sync B5, swap Homepage from mock → API, header live categories |
| **2** | Search + suggest + all filter query parsing, faceting, sorting, pagination | Search autocomplete upgrade, PLP with facets, URL state, ProductCard hover secondary image, mobile filter drawer, infinite scroll |
| **3** | Customer auth (Sanctum customer guard), `password` field migration, wishlist, reviews table + endpoints | Login / register, account dashboard, orders, addresses, wishlist page, PDP gallery + buy box + reviews + related carousels |
| **4** | Cart validate, checkout quote + place (transaction, stock move, journal, coupon redemption), coupons + redemptions migrations, PDF receipt endpoint | Mini cart + full page + coupon validate + free‑shipping progress, single‑page checkout accordion, success page, PDF download, distraction‑free layout |
| **5** | Promotions (Phase K admin side), product relations endpoints, `tenant_settings` storefront keys, performance indexes | Admin hooks: storefront toggles, hero / promo banner editor, coupon editor, review moderation queue |
| **6** | Caching, cache invalidation observers, sitemap.xml, robots.txt, structured data keys | Mobile bottom nav, analytics event wiring, Playwright e2e suite, a11y audit, performance LCP pass, polish |

Total: ~6 two‑week sprints → ~3 months to a full production storefront channel.

---

## Phase M — Success Metrics / Acceptance Criteria

- Homepage LCP < 2.5 s on 3G; PLP first paint < 1.5 s cached.
- Cart → checkout → success happy path completes in ≤ 3 taps on mobile.
- Cart abandonment telemetry shows ≥ 25% completion (industry avg ~22%).
- Multi‑tenant test: 2 tenants, each sees only its products, categories, coupons; no cross‑tenant bleed.
- Stock decrements exactly once per placed order (idempotent retry coverage).
- Coupon redemption impossible beyond `usage_limit` or `per_customer_limit`.
- All storefront endpoints < 100 ms p95 cached, < 300 ms p95 uncached.
- WCAG AA pass on PDP and Checkout.
- E2E test goes green on every PR.

---

## Phase N — Open Decisions (need your confirmation)

1. **Hero**: single image (strictly per spec) vs. 2‑slide crossfade if tenant wants flexibility?
2. **Storefront root**: keep under `/store` (current) or move to `/` and put admin under `/admin` so the shop is the landing page?
3. **Payments priority**: bKash / Nagad / COD only for v1, defer SSLCommerz card + Apple / Google Pay to v1.1?
4. **Reviews**: verified‑purchase required (recommended) or any authed customer can review any product?
5. **New tables**: confirm adding `product_reviews`, `wishlists`, `coupons`, `coupon_redemptions`, and `add_to_customers (password, email_verified_at)` migrations to `inventory-api`?
6. **Mobile wallets / Apple Pay / Google Pay**: defer to Phase I (v1.1) or include in v1?
7. **Admin toggles (Phase K)**: implement alongside storefront (same sprints) or schedule a separate admin sprint so the storefront works first with everything visible by default?

---

*Once decisions (§N) are confirmed, this plan converts into a granular todo list per sprint, starting with Phase A + B (Sprint 1).*