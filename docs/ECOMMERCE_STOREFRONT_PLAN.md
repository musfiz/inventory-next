# UIMS Ecommerce Storefront — Integration Plan

## 1. Executive Summary

**Goal:** Build a modern, high-performance, multi-tenant ecommerce storefront in Next.js that integrates directly with the existing UIMS Laravel backend. The storefront reads product catalog, categories, brands, stock, and pricing from the UIMS API, and writes orders back as `sales_orders` — making the ecommerce site a first-party sales channel alongside POS and manual sales order entry.

**Design Reference:** [Pickbazar](https://pickbazar-react-rest.vercel.app/) — clean product grid, discount badges, global search, category sidebar, right-side cart drawer, one-click checkout.

**Current State:** The UIMS backend already has everything needed for a storefront:
- **Products** with variations, multiple images, SEO meta, descriptions, featured/new/bestseller/on-sale flags
- **Product variations** with `selling_price`, `mrp` (for strike-through pricing), `dp` (dealer price for B2B), and attribute-based variants (size, color with `hex_code` swatches)
- **Categories** with unlimited parent/child hierarchy + business-type pivot
- **Brands** with logos
- **Stock** tracked per variation + warehouse, with `reserved_quantity` for cart holds
- **Sales orders** with `shipping_address`, `shipping_method`, `shipping_charge`, discounts, tax, payment recording
- **Customers** with `type: 'retail'|'wholesale'|'corporate'|'dealer'`
- **Payment methods**: cash, card, bKash, Nagad, Rocket, bank transfer, check, credit

**What does NOT exist yet (must be built):**
- Customer authentication (login/register/account) — current auth is staff-only (Sanctum guard for admin/tenant users)
- Ecommerce-specific settings in `tenant_settings` (store name, currency, low-stock threshold, out-of-stock behavior, shipping defaults)
- Category visibility control (which categories appear on the storefront)
- Product visibility flags for ecommerce (separate from admin `status`)
- Cart, wishlist, checkout, order tracking, reviews — all new frontend features
- Payment gateway integrations (SSLCommerz, bKash, Stripe, etc.)
- Search backend (autocomplete, typo tolerance)

**Why this approach (first-party storefront, not Shopify/Woo integration):**
- Full control over UI/UX — modern, branded, per-tenant customization
- No monthly platform fees
- Direct real-time stock sync (no sync engine needed — same database)
- Orders flow directly into UIMS `sales_orders` — no mapping layer
- Reuses all existing product/category/brand/customer infrastructure

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Customer)                      │
│                                                             │
│   Next.js Storefront (app/(storefront)/)                    │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┐ │
│   │ Homepage │ Catalog  │ Product  │ Cart     │ Checkout │ │
│   │ + Search │ + Filters│ Detail   │ Drawer   │ + Payment│ │
│   └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘ │
│        │          │          │          │          │       │
│   ┌────┴──────────┴──────────┴──────────┴──────────┴─────┐ │
│   │  Storefront Service Layer (services/storefront/)     │ │
│   │  storeCatalogService · storeCartService ·            │ │
│   │  storeAuthService · storeOrderService ·              │ │
│   │  storePaymentService · storeSearchService            │ │
│   └────────────────────┬────────────────────────────────┘ │
│                        │                                   │
└────────────────────────┼───────────────────────────────────┘
                         │ HTTPS (Sanctum cookies / customer token)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Laravel Backend (UIMS)                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  NEW: Storefront API (routes/api.php, prefix: v1)     │ │
│  │                                                       │ │
│  │  Public (no auth):                                    │ │
│  │   GET /store/{slug}/products         (catalog)        │ │
│  │   GET /store/{slug}/products/{id}    (detail)         │ │
│  │   GET /store/{slug}/categories       (menu tree)      │ │
│  │   GET /store/{slug}/brands           (brand list)     │ │
│  │   GET /store/{slug}/search           (smart search)   │ │
│  │   GET /store/{slug}/settings         (store config)   │ │
│  │                                                       │ │
│  │  Customer auth (guard: customer):                     │ │
│  │   POST /store/customer/register                      │ │
│  │   POST /store/customer/login                          │ │
│  │   GET  /store/customer/me                             │ │
│  │   POST /store/customer/logout                         │ │
│  │                                                       │ │
│  │  Customer actions (auth: customer):                   │ │
│  │   GET  /store/customer/wishlist                       │ │
│  │   POST /store/customer/wishlist/add                   │ │
│  │   POST /store/customer/wishlist/remove                │ │
│  │   GET  /store/customer/orders                         │ │
│  │   GET  /store/customer/orders/{uuid}                  │ │
│  │   POST /store/customer/orders/{uuid}/cancel           │ │
│  │   POST /store/customer/orders/{uuid}/return           │ │
│  │   POST /store/customer/reviews                        │ │
│  │                                                       │ │
│  │  Checkout (guest + auth):                             │ │
│  │   POST /store/checkout/cart                           │ │
│  │   POST /store/checkout/place-order                    │ │
│  │   POST /store/checkout/payment/initiate               │ │
│  │   POST /store/checkout/payment/verify                 │ │
│  │   GET  /store/checkout/payment/callback               │ │
│  └───────────────────────┬───────────────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────────────┐ │
│  │  Existing UIMS Models (reused, not duplicated)        │ │
│  │                                                       │ │
│  │  Product → ProductVariation → ProductImage            │ │
│  │  Category (hierarchy) → Brand → Unit                  │ │
│  │  Customer (type: retail) → SalesOrder → Payment       │ │
│  │  Stock (variation + warehouse) → StockMovement        │ │
│  │  Tenant → TenantSettings → BusinessType               │ │
│  └───────────────────────┬───────────────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────────────┐ │
│  │  NEW: Ecommerce-specific tables                       │ │
│  │                                                       │ │
│  │  customer_users (auth identities, separate from staff)│ │
│  │  wishlists (customer_id + variation_id)               │ │
│  │  product_reviews (customer_id + product_id + rating)  │ │
│  │  store_settings (ecommerce config per tenant)         │ │
│  │  store_category_visibility (which categories to show) │ │
│  │  abandoned_carts (guest email + cart snapshot)        │ │
│  │  payment_transactions (gateway tracking)              │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Deployment Options

| Option | Description | Pros | Cons | Recommendation |
|--------|-------------|------|------|----------------|
| **A. Route group in same app** | `app/(storefront)/` in the existing `nexus-dashboard-site` | Shares types, services, axios config; single deploy | Bundle size includes admin code; routing complexity | Good for MVP |
| **B. Separate Next.js app** | New repo `inventory-storefront`, same Laravel API | Clean separation; independent deploy/CI; smaller bundle | Duplicate types/services; two codebases | Better long-term |
| **C. Monorepo (Turborepo/Nx)** | Shared `packages/ui`, `packages/types`, `apps/admin`, `apps/storefront` | Best code sharing + separation | Setup overhead; team familiarity | Best for scale |

**Recommendation:** Start with **Option A** (route group) for MVP speed, migrate to **Option B or C** when the storefront stabilizes and team grows.

---

## 3. Storefront Pages & Routing

### 3.1 Route Structure (Option A — route group in existing app)

```
app/
├── (auth)/                        ← existing admin login
├── (protected)/                   ← existing admin dashboard
└── (storefront)/                  ← NEW: customer-facing ecommerce
    ├── layout.tsx                 ← storefront shell (header, footer, cart drawer)
    ├── page.tsx                   ← homepage (hero, featured, categories, bestsellers)
    ├── [tenantSlug]/
    │   ├── layout.tsx             ← tenant-specific layout (logo, theme color, nav)
    │   ├── page.tsx               ← tenant homepage
    │   ├── products/
    │   │   ├── page.tsx           ← catalog grid (filters, sort, pagination)
    │   │   └── [productSlug]/
    │   │       └── page.tsx       ← product detail (gallery, variants, add to cart)
    │   ├── category/
    │   │   └── [categorySlug]/
    │   │       └── page.tsx       ← category-filtered catalog
    │   ├── brand/
    │   │   └── [brandSlug]/
    │   │       └── page.tsx       ← brand-filtered catalog
    │   ├── search/
    │   │   └── page.tsx           ← search results page
    │   ├── cart/
    │   │   └── page.tsx           ← full cart page (alternative to drawer)
    │   ├── checkout/
    │   │   ├── page.tsx           ← checkout form (shipping, payment, review)
    │   │   └── success/
    │   │       └── page.tsx       ← order confirmation
    │   ├── order/
    │   │   └── [orderUuid]/
    │   │       └── page.tsx       ← order tracking / detail
    │   ├── account/
    │   │   ├── layout.tsx         ← account sidebar (profile, orders, wishlist, addresses)
    │   │   ├── page.tsx           ← account dashboard
    │   │   ├── orders/
    │   │   │   └── page.tsx       ← order history
    │   │   ├── wishlist/
    │   │   │   └── page.tsx       ← saved items
    │   │   ├── addresses/
    │   │   │   └── page.tsx       ← saved shipping addresses
    │   │   └── settings/
    │   │       └── page.tsx       ← profile settings
    │   ├── login/
    │   │   └── page.tsx           ← customer login
    │   ├── register/
    │   │   └── page.tsx           ← customer registration
    │   └── about/
    │       └── page.tsx           ← about / contact
    └── _components/               ← storefront-only components (not routed)
```

### 3.2 Tenant Resolution

```
URL Pattern:  /{tenantSlug}/products
              /{tenantSlug}/products/some-product-slug

Resolution:
  1. Extract [tenantSlug] from URL
  2. GET /api/v1/store/{slug}/settings → tenant info, theme, currency, store config
  3. If tenant not found or ecommerce not enabled → 404 storefront page
  4. If tenant is active → render storefront with tenant's branding
```

**Future:** Subdomain routing (`howlader-electric.uims.shop`) mapped to tenant via `domains` table.

---

## 4. Homepage & Navigation

### 4.1 Homepage Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]  [Electronics ▾] [Fashion ▾] [Grocery ▾]    [🔍 Search...]  [👤 Account] [🛒 Bag(3)] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Hero Banner Carousel (auto-rotating)              │  │
│  │   "Electronics Delivered in 24 Hours"                          │  │
│  │   [Shop Now]                                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── Category Icons Row ───────────────────────────────────────┐   │
│  │  📱 Mobile  💻 Laptop  🎧 Audio  ⚡ Charger  🔋 Battery  ...  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── Flash Sale Banner ───────────────────────────────────────┐    │
│  │  ⚡ Flash Sale — Ends in 02:14:33   [View All →]            │    │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ [Product] [Product] [Product] [Product] [Product] [Product]  │   │
│  │  -20%     -15%     -30%     -10%     -25%     -40%          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── Featured Products ───────────────────────────────────────┐    │
│  │  ⭐ Featured Products                        [View All →]    │    │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ [Product] [Product] [Product] [Product] [Product] [Product]  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── Best Sellers ────────────────────────────────────────────┐    │
│  │  🔥 Best Sellers                              [View All →]   │    │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ [Product] [Product] [Product] [Product] [Product] [Product]  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── New Arrivals ────────────────────────────────────────────┐    │
│  │  ✨ New Arrivals                              [View All →]   │    │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ [Product] [Product] [Product] [Product] [Product] [Product]  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── Promo Banners (2-col) ───────────────────────────────────┐    │
│  │  [Banner: Summer Sale]        [Banner: New Gadgets]          │    │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Footer:  About | Contact | Shipping Policy | Returns | FAQ | Terms  │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Multi-Level Dropdown Menu (up to 3 levels)

The navigation menu is built from the UIMS category tree. Categories marked as "visible on storefront" in the admin portal appear here.

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]   Electronics ▾        Fashion ▾    Grocery ▾   │
│           ┌──────────────┐     ┌──────────┐             │
│           │ Mobile ▸     │     │ Men ▸    │             │
│           │  ├ Smartphones│    │  ├ Shirts │             │
│           │  ├ Cases      │    │  ├ Pants  │             │
│           │  ├ Accessories│    │  └ Shoes  │             │
│           │ Laptop ▸     │     │ Women ▸  │             │
│           │  ├ Notebooks  │    │  ├ Dresses│             │
│           │  ├ Bags       │    │  └ Bags   │             │
│           │ Audio ▸      │     │ Kids ▸   │             │
│           │  ├ Headphones │    └──────────┘             │
│           │  ├ Speakers   │                               │
│           │  └ Earbuds    │                               │
│           │ Accessories   │                               │
│           │ Wearables     │                               │
│           └──────────────┘                               │
└─────────────────────────────────────────────────────────┘

Level 1: Top-level category (Electronics, Fashion, Grocery)
Level 2: Subcategory (Mobile, Laptop, Audio)
Level 3: Sub-subcategory (Smartphones, Cases, Accessories)
```

**Menu implementation:**
- Fetched from `GET /api/v1/store/{slug}/categories` (returns full tree, cached on client)
- Rendered with CSS hover + keyboard accessible (ARIA)
- Mega-menu option for categories with many children (like Pickbazar)
- Mobile: hamburger menu with accordion expansion per level

### 4.3 Global Search Bar

Prominent search bar in the header, visible on all pages. Features:
- **Autocomplete** — as the user types, show product suggestions in a dropdown
- **Typo tolerance** — fuzzy matching (Meilisearch or backend LIKE with trigram)
- **Category scoping** — search within a category
- **Recent searches** — stored in localStorage
- **Popular searches** — from backend analytics
- **Product images in dropdown** — thumbnail + name + price in the autocomplete

```
┌───────────────────────────────────────────────┐
│  🔍 Search for products...                    │
├───────────────────────────────────────────────┤
│  Recent: "wireless mouse", "usb-c cable"      │
├───────────────────────────────────────────────┤
│  Suggestions:                                 │
│  📷 Wireless Mouse Logitech M235    $25.00    │
│  📷 USB-C Cable 2m Anker           $12.00    │
│  📷 Wireless Earbuds JBL Tune      $45.00    │
│  📷 Wireless Charger Belkin        $30.00    │
├───────────────────────────────────────────────┤
│  Popular: "laptop", "headphone", "power bank" │
└───────────────────────────────────────────────┘
```

---

## 5. Product Catalog & Filtering

### 5.1 Catalog Page

```
┌──────────────────────────────────────────────────────────────────────┐
│  Electronics > Mobile > Smartphones                                  │
├────────────┬─────────────────────────────────────────────────────────┤
│            │  Smartphones (145 products)          Sort: [Relevance ▾]│
│  Filters   ├─────────────────────────────────────────────────────────┤
│            │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  Category  │  │ Prod │ │ Prod │ │ Prod │ │ Prod │ │ Prod │          │
│  ○ Mobile  │  │ img  │ │ img  │ │ img  │ │ img  │ │ img  │          │
│  ○ Laptop  │  │      │ │      │ │      │ │      │ │      │          │
│  ○ Audio   │  │ Name │ │ Name │ │ Name │ │ Name │ │ Name │          │
│            │  │ $200 │ │ $150 │ │ $300 │ │ $99  │ │ $250 │          │
│  Brand     │  │ -20% │ │      │ │ -10% │ │      │ │ -15% │          │
│  ☑ Apple   │  │ [🛒] │ │ [🛒] │ │ [🛒] │ │ [🛒] │ │ [🛒] │          │
│  ☑ Samsung │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│  ☐ Xiaomi  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│            │  │ ...  │ │ ...  │ │ ...  │ │ ...  │ │ ...  │          │
│  Price     │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│  $0-$100   │                                                         │
│  $100-$300 │  [Load More]  or  [1] [2] [3] ... [29]                  │
│  $300-$500 │                                                         │
│            │                                                         │
│  Attributes│                                                         │
│  Color:    │                                                         │
│  ⬤ ⬤ ⬤ ⬤  │                                                         │
│  Size:     │                                                         │
│  [S][M][L] │                                                         │
│            │                                                         │
│  Rating    │                                                         │
│  ★★★★☆ &up│                                                         │
│            │                                                         │
│  ☐ In Stock│                                                         │
│  ☐ On Sale │                                                         │
│            │                                                         │
│  [Apply]   │                                                         │
│  [Clear All│                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

### 5.2 Filter Types

| Filter | Source | Implementation |
|--------|--------|----------------|
| **Category** | UIMS `categories` tree (parent/child) | Sidebar tree with expand/collapse; URL param `?category=` |
| **Brand** | UIMS `brands` (filtered by business_type) | Checkbox list; URL param `?brand[]=apple&brand[]=samsung` |
| **Price range** | From `product_variations.selling_price` | Slider or range buttons; URL param `?min_price=&max_price=` |
| **Attributes** | UIMS `attributes` + `attribute_values` (size, color, etc.) | Color swatches (using `hex_code`), size buttons, checkbox lists; URL param `?attr[color]=red&attr[size]=m` |
| **Rating** | From `product_reviews` (new table) | Star filter; URL param `?min_rating=4` |
| **Availability** | From `stocks` (quantity > 0) | Checkbox "In Stock"; URL param `?in_stock=1` |
| **On Sale** | From `products.is_on_sale` flag | Checkbox "On Sale"; URL param `?on_sale=1` |
| **Sort** | — | Relevance, Price Low→High, Price High→Low, Newest, Best Selling, Top Rated; URL param `?sort=` |

### 5.3 Product Card (in grid)

Each product card shows:
- Product image (optimized via `next/image`, lazy-loaded)
- Discount badge (if `mrp` > `selling_price`, show percentage off)
- Product name (truncated to 2 lines)
- Short description or unit (e.g., "1lb", "500ml")
- Price: `selling_price` with optional strike-through `mrp`
- "Add to Cart" button (adds default variation)
- "Buy Now" button (adds to cart + redirects to checkout)
- Quick view on hover (opens product detail modal)
- Wishlist heart icon (if logged in)
- "Out of Stock" overlay if no stock available

```
┌──────────────┐
│  [-20%]      │
│  ┌────────┐  │
│  │  Image │  │
│  │        │  │
│  └────────┘  │
│              │
│ Product Name │
│ 1lb          │
│ $2.00 $1.60  │
│              │
│ [🛒] [⚡ Buy]│
│         [♡]  │
└──────────────┘
```

**Click behavior:**
- Click on product image or name → navigate to product detail page
- Click "🛒 Add to Cart" → adds to cart ( AJAX, no page redirect), shows toast notification, cart badge updates
- Click "⚡ Buy Now" → adds to cart + redirects to `/checkout` immediately
- Click "♡" → adds to wishlist (if logged in) or prompts login

---

## 6. Product Detail Page

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Electronics > Mobile > Smartphones > iPhone 15 Pro                  │
├───────────────────────────┬──────────────────────────────────────────┤
│                           │  iPhone 15 Pro                            │
│  ┌─────────────────────┐  │  ⭐ 4.8 (124 reviews)                    │
│  │                     │  │                                          │
│  │   Main Image        │  │  $999.00  $1,099.00  (Save $100)        │
│  │   (zoom on hover)   │  │                                          │
│  │                     │  │  Brand: Apple                            │
│  └─────────────────────┘  │  Category: Smartphones                   │
│                           │  SKU: IPH-15PRO-256                      │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐    │  Availability: ✅ In Stock (15 units)    │
│  │1 │ │2 │ │3 │ │4 │    │                                          │
│  └──┘ └──┘ └──┘ └──┘    │  Storage:                                 │
│  Thumbnails               │  ( ) 128GB  (•) 256GB  ( ) 512GB         │
│                           │                                          │
│                           │  Color:                                   │
│                           │  ⬛ Black  ⬜ Silver  🟤 Brown  ⭕ Blue   │
│                           │                                          │
│                           │  Quantity: [-] 1 [+]                     │
│                           │                                          │
│                           │  [🛒 Add to Cart]  [⚡ Buy Now]          │
│                           │  [♡ Add to Wishlist]                     │
│                           │                                          │
│                           │  🚚 Estimated delivery: 2-3 days         │
│                           │  📍 Ships from: Dhaka Warehouse          │
│                           │  ✅ Free shipping over $500              │
│                           │                                          │
├───────────────────────────┴──────────────────────────────────────────┤
│  Description                                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Full product description (rich text from UIMS)                │  │
│  │  Specifications table (from custom_fields / attributes)        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Customer Reviews (124)                                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ★★★★★  "Excellent phone, fast delivery"                       │  │
│  │  — John D., 3 days ago                                         │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  ★★★★☆  "Great but battery could be better"                    │  │
│  │  — Sarah K., 1 week ago                                        │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  [Write a Review]                                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Related Products                                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │ Prod │ │ Prod │ │ Prod │ │ Prod │ │ Prod │                      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Key Features

| Feature | Implementation |
|---------|---------------|
| **Image gallery** | Main image + thumbnail strip; click thumbnail to swap; hover zoom (magnifier); `next/image` for optimization |
| **Variation selection** | Radio buttons for storage, color swatches (from `AttributeValue.hex_code`), size buttons; price updates on selection; stock check per variation |
| **Quantity selector** | +/- buttons with min 1, max = available stock; validates against `stocks.quantity` |
| **Add to Cart** | AJAX POST to cart service; toast notification; cart badge increment; drawer can open automatically |
| **Buy Now** | Adds to cart + immediately redirects to `/checkout` |
| **Wishlist** | Heart toggle; requires customer login; POST to wishlist API |
| **Stock display** | Real-time from `stocks` table: "In Stock (15 units)", "Low Stock (3 left)", "Out of Stock" |
| **Shipping estimate** | Based on tenant settings (default delivery days) + product weight |
| **Reviews** | Star ratings + text; only verified buyers can review; moderation by tenant admin |
| **Related products** | Same category or same brand; fetched via `GET /store/{slug}/products?category_id=&exclude={current}&limit=5` |
| **SEO** | `generateMetadata` from `Product.meta_title`, `meta_description`, `meta_keywords`; Open Graph tags; structured data (JSON-LD Product schema) |
| **Breadcrumbs** | Category hierarchy from UIMS: Electronics > Mobile > Smartphones > iPhone 15 Pro |

---

## 7. Cart System

### 7.1 Right-Side Cart Drawer (Expandable Bag)

A cart icon in the header with a badge showing item count. Clicking opens a right-side drawer (overlay panel) that slides in from the right — exactly like Pickbazar.

```
┌────────────────────────────────────────────────────┐
│  Shopping Bag (3 items)                     [✕]    │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌────┐  Wireless Mouse Logitech M235              │
│  │ 📷 │  Color: Black                              │
│  │    │  $25.00     [-] 2 [+]     [Remove]        │
│  └────┘                                            │
│                                                    │
│  ┌────┐  USB-C Cable 2m Anker                      │
│  │ 📷 │  $12.00     [-] 1 [+]     [Remove]        │
│  └────┘                                            │
│                                                    │
│  ┌────┐  Wireless Earbuds JBL Tune                 │
│  │ 📷 │  Color: White                              │
│  │    │  $45.00    [-] 1 [+]     [Remove]        │
│  └────┘                                            │
│                                                    │
├────────────────────────────────────────────────────┤
│  Subtotal:                              $107.00    │
│  Shipping:                              Calculated │
│  Tax (5%):                              $5.35     │
│  ─────────────────────────────────────             │
│  Total:                                 $112.35    │
├────────────────────────────────────────────────────┤
│  [View Full Cart]    [Proceed to Checkout →]      │
└────────────────────────────────────────────────────┘
```

**Cart drawer behaviors:**
- Slides in from right with backdrop overlay
- Shows each item with thumbnail, name, selected variation attributes, price, quantity stepper, remove button
- Live subtotal, estimated shipping, tax, total
- "View Full Cart" → full cart page (`/{tenantSlug}/cart`)
- "Proceed to Checkout" → checkout page
- Quantity changes update state immediately (debounced API sync for logged-in users)
- Empty state: "Your bag is empty" + "Continue Shopping" button

### 7.2 Cart State Management

**Technology:** Zustand (already in the project) + `persist` middleware for localStorage.

```
stores/cart-store.ts (NEW)

State:
  items: CartItem[]
  drawerOpen: boolean
  couponCode: string | null
  discountAmount: number

Actions:
  addItem(variationId, productId, quantity)
  removeItem(variationId)
  updateQuantity(variationId, quantity)
  clearCart()
  openDrawer() / closeDrawer() / toggleDrawer()
  applyCoupon(code) / removeCoupon()

CartItem:
  variationId: string
  productId: string
  name: string
  slug: string
  image: string (primary image URL)
  unitPrice: number (from variation.selling_price)
  mrp: number | null (from variation.mrp)
  quantity: number
  attributes: { [attrName]: attrValue }  (e.g., { Color: "Black", Size: "M" })
  stock: number (cached for display)
  lineTotal: number (unitPrice * quantity)
```

### 7.3 Persistent Cart (Guest + Logged-in)

| State | Storage | Sync |
|-------|---------|------|
| **Guest** | localStorage (Zustand persist) | No server sync; cart persists across sessions on same browser |
| **Logged-in** | localStorage + server | Cart synced to server on login (merge guest cart → server cart); server is source of truth |
| **Login merge** | — | On successful login: POST guest cart items to server → server merges with existing → replace local with merged result |
| **Cross-device** | Server (logged-in) | On login from new device: GET server cart → load into local |

---

## 8. Checkout Flow

### 8.1 Checkout Page

```
┌──────────────────────────────────────────────────────────────────────┐
│  Checkout                                                    [← Cart] │
├──────────────────────────────────────┬───────────────────────────────┤
│                                      │  Order Summary                │
│  1. Contact Information              │                               │
│  ┌──────────────────────────────┐    │  ┌────┐ Mouse M235    $25.00 │
│  │ Email:    [john@example.com] │    │  │ 📷 │ x2           $50.00  │
│  │ Phone:    [+880 17xxx]       │    │  └────┘                      │
│  └──────────────────────────────┘    │  ┌────┐ USB-C Cable  $12.00 │
│                                      │  │ 📷 │ x1           $12.00  │
│  2. Shipping Address                 │  └────┘                      │
│  ┌──────────────────────────────┐    │  ┌────┐ Earbuds JBL  $45.00 │
│  │ Name:     [John Doe]         │    │  │ 📷 │ x1           $45.00  │
│  │ Address:  [House 12, Road 5] │    │  └────┘                      │
│  │ City:     [Dhaka]    [▾]     │    │                               │
│  │ Area:     [Gulshan]  [▾]     │    │  Subtotal:         $107.00   │
│  │ Zip:      [1212]             │    │  Shipping:         $5.00     │
│  │ Country:  Bangladesh         │    │  Tax (5%):         $5.35     │
│  └──────────────────────────────┘    │  Discount:         -$0.00    │
│                                      │  ─────────────────────────    │
│  ☐ Save this address for next time  │  Total:            $117.35    │
│                                      │                               │
│  3. Shipping Method                  │  [Have a coupon?]            │
│  (•) Standard Delivery (2-3 days)    │  [Enter code] [Apply]        │
│      $5.00                           │                               │
│  ( ) Express Delivery (1 day)        │                               │
│      $15.00                          │                               │
│  ( ) Pickup from Store               │                               │
│      Free                            │                               │
│                                      │                               │
│  4. Payment Method                   │                               │
│  ┌────────────┐ ┌────────────┐       │                               │
│  │ 💳 Card     │ │ 📱 bKash   │       │                               │
│  │ Credit/    │ │ Mobile     │       │                               │
│  │ Debit      │ │ Banking    │       │                               │
│  └────────────┘ └────────────┘       │                               │
│  ┌────────────┐ ┌────────────┐       │                               │
│  │ 📱 Nagad    │ │ 🏦 Bank    │       │                               │
│  │ Mobile     │ │ Transfer   │       │                               │
│  │ Banking    │ │            │       │                               │
│  └────────────┘ └────────────┘       │                               │
│  ┌────────────┐ ┌────────────┐       │                               │
│  │ 💵 Cash on │ │ 🔄 SSL     │       │                               │
│  │ Delivery   │ │ Commerz    │       │                               │
│  └────────────┘ └────────────┘       │                               │
│                                      │                               │
│  ☐ I agree to the Terms & Conditions│                               │
│                                      │                               │
│  [Place Order →]                     │                               │
└──────────────────────────────────────┴───────────────────────────────┘
```

### 8.2 One-Click Checkout (Express)

For returning logged-in customers with a saved address and default payment method:

```
┌──────────────────────────────────────────────┐
│  ⚡ Express Checkout                         │
│                                              │
│  Ship to: John Doe, Gulshan, Dhaka          │
│  Pay with: 📱 bKash (017xxx***23)           │
│                                              │
│  Total: $117.35                             │
│                                              │
│  [Buy Now — 1 Click]                        │
└──────────────────────────────────────────────┘
```

- Skips the multi-step form entirely
- Uses the customer's default shipping address + preferred payment method
- Shows a summary in a compact card
- Single button click → order placed → redirect to success page
- Available only for logged-in customers with saved address + payment method

### 8.3 Guest Checkout

Customers can checkout without creating an account:
- Only email + phone + shipping address required
- Order is created as a `Customer` record with `type: 'retail'` (or linked to existing by email/phone)
- After order placement, prompt: "Create an account to track your order and save your details"
- Order tracking via order UUID (emailed to customer)

### 8.4 Order Placement Flow (Backend)

```
1. Frontend POST /api/v1/store/checkout/place-order
   Body:
   {
     tenant_slug: "howlader-electric",
     customer: { email, phone, name, address, city, area, zip },
     items: [ { variation_id, quantity, unit_price } ],
     shipping_method: "standard",
     shipping_charge: 5.00,
     payment_method: "bkash",
     coupon_code: null,
     notes: null,
     is_guest: true
   }

2. Backend:
   a. Validate items (check stock, check prices, check tenant scope)
   b. Create or find Customer record (by email/phone)
   c. Create SalesOrder:
      - customer_id → customer.id
      - sub_total → sum(items)
      - discount_amount → from coupon
      - tax_amount → calculated from tenant settings
      - shipping_charge → from selected method
      - grand_total → sub_total - discount + tax + shipping
      - status → 'pending'
      - payment_status → 'pending'
      - shipping_address → formatted address
      - shipping_method → selected method
   d. Create SalesOrderItems (one per cart item)
   e. Reserve stock (increment stocks.reserved_quantity)
   f. If payment method is online (card/bkash/nagad/sslcommerz):
      → Initiate payment gateway transaction
      → Return payment URL/redirect info
   g. If payment method is COD:
      → Mark order as confirmed
      → Send order confirmation email
   h. Return: { order_uuid, payment_redirect_url? }

3. Frontend:
   a. If payment_redirect_url → redirect to gateway
   b. Else → redirect to /checkout/success?order={uuid}
```

### 8.5 Payment Gateway Integration

#### Supported Gateways

| Gateway | Method | Type | Status |
|---------|--------|------|--------|
| **SSLCommerz** | Card, Mobile Banking, Net Banking | Hosted redirect | Build first |
| **bKash** | Mobile Banking | Direct API / hosted | Build first |
| **Nagad** | Mobile Banking | Direct API / hosted | Build first |
| **Stripe** | Card (international) | Stripe.js + backend | Phase 2 |
| **Cash on Delivery** | — | No gateway | Build first |
| **Bank Transfer** | — | Manual verification | Build first |
| **Rocket** | Mobile Banking | API | Phase 2 |
| **aamarPay** | Aggregator | Hosted redirect | Phase 2 |

#### Gateway Abstraction Layer

```
Backend: app/Services/PaymentGatewayService.php

interface PaymentGatewayInterface {
  initiatePayment($orderId, $amount, $currency, $callbackUrl): PaymentInitResult
  verifyPayment($transactionId, $gatewayResponse): PaymentVerifyResult
  refundPayment($transactionId, $amount): RefundResult
  getTransactionStatus($transactionId): TransactionStatus
}

Implementations:
  - SslCommerzGateway implements PaymentGatewayInterface
  - BkashGateway implements PaymentGatewayInterface
  - NagadGateway implements PaymentGatewayInterface
  - StripeGateway implements PaymentGatewayInterface
  - CodGateway implements PaymentGatewayInterface (no-op, marks as pending)
  - BankTransferGateway implements PaymentGatewayInterface (generates instructions)

Config (store_settings):
  enabled_gateways: ["sslcommerz", "bkash", "nagad", "cod", "bank_transfer"]
  gateway_credentials: { sslcommerz: { store_id, store_passwd }, bkash: { app_key, app_secret }, ... }
```

#### Payment Flow (Online Gateway)

```
Frontend                    Backend                    Gateway
   │                          │                          │
   │ POST /place-order        │                          │
   ├─────────────────────────▶│                          │
   │                          │ Create SalesOrder        │
   │                          │ (status: pending)        │
   │                          │                          │
   │                          │ POST /payment/initiate   │
   │                          ├─────────────────────────▶│
   │                          │                          │
   │                          │  Payment URL / Token     │
   │                          │◀─────────────────────────┤
   │  { payment_redirect_url }│                          │
   │◀─────────────────────────┤                          │
   │                          │                          │
   │  Redirect to gateway     │                          │
   ├──────────────────────────────────────────────────────▶│
   │                          │                          │
   │                     Customer pays on gateway         │
   │                          │                          │
   │  Redirect to callback URL│                          │
   │◀──────────────────────────────────────────────────────┤
   │                          │                          │
   │ GET /payment/callback     │                          │
   │   ?tran_id=xxx&status=OK │                          │
   ├─────────────────────────▶│                          │
   │                          │ POST /payment/verify     │
   │                          ├─────────────────────────▶│
   │                          │  Verified ✓              │
   │                          │◀─────────────────────────┤
   │                          │                          │
   │                          │ Update Payment row       │
   │                          │ (status: completed)      │
   │                          │ Update SalesOrder        │
   │                          │ (payment_status: paid)   │
   │                          │ Confirm stock reservation│
   │                          │ Send confirmation email  │
   │                          │                          │
   │  Redirect to /success    │                          │
   │◀─────────────────────────┤                          │
   │                          │                          │
```

---

## 9. Customer Accounts

### 9.1 Customer Authentication (NEW)

The current UIMS has only staff auth (Sanctum guard for admin/tenant users). The storefront needs a **separate customer auth guard**.

```
Backend:
  config/auth.php → add 'customer' guard with 'customer' provider
  CustomerUser model (separate from User) → uses customers table or new customer_users table
  Routes: /api/v1/store/customer/{login,register,me,logout,forgot-password,reset-password}

Frontend:
  services/storeAuthService.ts (NEW, uses separate axios instance or same with different endpoints)
  hooks/use-customer-auth.ts (SWR on GET /api/v1/store/customer/me)
  stores/customer-auth-store.ts (Zustand + persist, key: 'customer-auth')
```

**Registration:**
```
POST /api/v1/store/customer/register
Body: { name, email, phone, password, password_confirmation, tenant_slug }
→ Creates Customer record (type: 'retail')
→ Creates CustomerUser auth identity
→ Returns customer + auth token/cookie
```

**Login:**
```
POST /api/v1/store/customer/login
Body: { email, password, tenant_slug }
→ Returns customer + auth token/cookie
```

### 9.2 Account Pages

```
┌──────────────────────────────────────────────────────────────────────┐
│  My Account                              [John Doe] [Logout]         │
├──────────────┬───────────────────────────────────────────────────────┤
│              │                                                       │
│  📊 Dashboard│  Welcome back, John!                                  │
│  📦 Orders   │                                                       │
│  ♡ Wishlist  │  Recent Orders:                                       │
│  📍 Addresses│  ┌────────────────────────────────────────────────┐  │
│  👤 Profile  │  │ #ORD-00123  3 items  $117.35  ✓ Delivered      │  │
│  ⚙️ Settings │  │ #ORD-00118  1 item   $25.00   🚚 Shipped       │  │
│  🔔 Notifications│ └────────────────────────────────────────────┘  │
│              │                                                       │
│              │  Wishlist (5 items):                                  │
│              │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│              │  │ 📷 │ │ 📷 │ │ 📷 │ │ 📷 │ │ 📷 │                 │
│              │  └────┘ └────┘ └────┘ └────┘ └────┘                 │
│              │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

### 9.3 Order History & Tracking

```
┌──────────────────────────────────────────────────────────────────────┐
│  Order #ORD-00123                                          [← Back]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Order Status:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ✓ Placed    ✓ Confirmed   ✓ Packed   🚚 Shipped   ○ Delivered│   │
│  │  Jul 10      Jul 10        Jul 11     Jul 11       Expected   │   │
│  │  09:15       09:30         08:00      16:00        Jul 13     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Items:                                                              │
│  ┌────┐  Wireless Mouse Logitech M235    $25.00 x2   $50.00        │
│  │ 📷 │  Color: Black                                                │
│  └────┘                                                              │
│  ┌────┐  USB-C Cable 2m Anker            $12.00 x1   $12.00        │
│  │ 📷 │                                                                │
│  └────┘                                                              │
│  ┌────┐  Wireless Earbuds JBL Tune      $45.00 x1   $45.00         │
│  │ 📷 │  Color: White                                                 │
│  └────┘                                                              │
│                                                                      │
│  Shipping Address:                                                   │
│  John Doe, House 12, Road 5, Gulshan, Dhaka 1212                    │
│  Phone: +880 17xxx                                                   │
│                                                                      │
│  Payment:                                                            │
│  Method: bKash (Mobile Banking)                                      │
│  Status: ✅ Paid                                                      │
│  Transaction ID: BKASH-XXX-12345                                     │
│                                                                      │
│  Summary:                                                            │
│  Subtotal:   $107.00                                                 │
│  Shipping:   $5.00                                                   │
│  Tax:        $5.35                                                   │
│  Total:      $117.35                                                 │
│                                                                      │
│  [Download Invoice PDF]  [Request Return]  [Reorder]               │
│  [Write a Review]                                                   │
│                                                                      │
│  Tracking:                                                           │
│  🚚 Courier: Steadfast                                                │
│  Tracking Number: SF-123456                                          │
│  [Track on Courier Website →]                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Order status flow:**
```
placed → confirmed → packed → shipped → delivered
                                    ↓
                              cancelled (customer can cancel before "shipped")
                                    ↓
                              return_requested → return_approved → returned → refunded
```

**Real-time updates:**
- Poll `GET /api/v1/store/customer/orders/{uuid}` every 30 seconds while order is active
- Or WebSocket/SSE for instant updates (Phase 2)
- Email/SMS notifications sent at each status change (backend)
- In-app notification bell for logged-in customers

### 9.4 Wishlist

```
┌──────────────────────────────────────────────────────────────────────┐
│  My Wishlist (5 items)                                               │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────┐  Wireless Mouse Logitech M235     $25.00  [🛒 Add] [✕]    │
│  │ 📷  │  In Stock                                              │
│  └──────┘                                                            │
│  ┌──────┐  USB-C Cable 2m Anker             $12.00  [🛒 Add] [✕]    │
│  │ 📷  │  In Stock                                              │
│  └──────┘                                                            │
│  ┌──────┐  iPhone 15 Pro 256GB              $999.00 [🛒 Add] [✕]    │
│  │ 📷  │  Out of Stock                                         │
│  └──────┘                                                            │
│  ...                                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

- Add to wishlist from product card or detail page (heart icon)
- Move to cart from wishlist page
- Remove from wishlist
- Stock status shown per item
- Requires customer login

---

## 10. Smart Search

### 10.1 Search Architecture

| Aspect | Phase 1 (MVP) | Phase 2 (Scale) |
|--------|---------------|-----------------|
| **Backend** | Laravel LIKE query with wildcards + trigram similarity | Meilisearch or Algolia (self-hosted or SaaS) |
| **Autocomplete** | Debounced API call (300ms), backend `LIKE %query%` on name + sku + short_description | Instant from Meilisearch index |
| **Typo tolerance** | MySQL `SOUNDEX()` or Levenshtein in PHP | Built-in Meilisearch typo tolerance |
| **Index** | None (queries live table) | Meilisearch index synced on product update via Laravel scout events |
| **Speed** | ~200ms for 10K products | ~20ms for 1M products |

### 10.2 Search API

```
GET /api/v1/store/{slug}/search?q=wireless+mouse&page=1&per_page=20
  &category_id=&brand_id=&min_price=&max_price=&sort=relevance

→ 200:
{
  "data": [
    {
      "id": "...",
      "name": "Wireless Mouse Logitech M235",
      "slug": "wireless-mouse-logitech-m235",
      "short_description": "...",
      "primary_image": "https://...",
      "selling_price": 25.00,
      "mrp": 30.00,
      "is_on_sale": true,
      "in_stock": true,
      "category": { "id": "...", "name": "Accessories", "slug": "accessories" },
      "brand": { "id": "...", "name": "Logitech", "slug": "logitech" },
      "relevance_score": 0.95
    }
  ],
  "meta": { "total": 145, "current_page": 1, ... },
  "suggestions": ["wireless mouse logitech", "wireless mouse pad", "wireless keyboard"],
  "facets": {
    "categories": [{ "name": "Accessories", "count": 45 }, ...],
    "brands": [{ "name": "Logitech", "count": 12 }, ...],
    "price_range": { "min": 5.00, "max": 250.00 }
  }
}
```

### 10.3 Autocomplete

```
GET /api/v1/store/{slug}/search/autocomplete?q=wire
  → 200:
  {
    "products": [
      { "id": "...", "name": "Wireless Mouse M235", "image": "...", "price": 25.00 },
      { "id": "...", "name": "Wireless Earbuds JBL", "image": "...", "price": 45.00 },
      { "id": "...", "name": "Wireless Charger", "image": "...", "price": 30.00 }
    ],
    "categories": [
      { "id": "...", "name": "Wireless Accessories", "slug": "wireless" }
    ],
    "suggestions": ["wireless mouse", "wireless earbuds", "wireless charger"]
  }
```

### 10.4 Search Features

- **Auto-complete dropdown** with product thumbnails (appears as user types, 300ms debounce)
- **Typo tolerance** — "wirless" matches "wireless"
- **Synonym mapping** — "mobile" → "smartphone", "laptop" → "notebook" (configurable per business type)
- **Search suggestions** — "Did you mean: wireless mouse?"
- **Empty state** — "No results for 'xyzq'. Try: [wireless mouse] [usb cable] [headphones]"
- **Recent searches** — stored in localStorage, shown when search bar focuses
- **Popular searches** — from backend analytics (top 10 searches per tenant)
- **Search within category** — scope the search to a selected category
- **Faceted results** — after search, show category/brand/price filters with counts

---

## 11. Image Optimization & Performance

### 11.1 Image Strategy

| Aspect | Implementation |
|--------|---------------|
| **Format** | WebP (with JPEG fallback for old browsers); backend converts on upload or serves originals + `next/image` converts on-the-fly |
| **Delivery** | `next/image` component with `width`/`height` props; generates `srcset` for responsive sizes |
| **Lazy loading** | `loading="lazy"` (default in `next/image`); images below the fold load on scroll |
| **Placeholder** | BlurDataURL (LQIP — low-quality image placeholder) for smooth loading; generated from backend or `plaiceholder` library |
| **CDN** | Backend serves images via Laravel file storage; for production, put a CDN (Cloudflare) in front |
| **Thumbnails** | Multiple sizes generated by `next/image`: 48px (cart), 200px (card), 600px (detail), 1200px (zoom) |
| **Compression** | `next/image` `quality={75}` default; configurable per image |
| **Aspect ratio** | Product cards use fixed aspect ratio (1:1 or 4:3) to prevent layout shift (CLS) |
| **Alt text** | From `ProductImage.alt_text` or fallback to product name (accessibility + SEO) |

### 11.2 Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| **LCP** (Largest Contentful Paint) | < 2.5s | Hero image optimized; critical CSS inlined; font preloaded |
| **FID/INP** (Interaction) | < 200ms | Minimal JS; server components where possible; deferred non-critical JS |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Fixed aspect ratios on images; skeleton loaders; no dynamic ad injection |
| **TTFB** (Time to First Byte) | < 600ms | Next.js SSR/ISR; Laravel response caching on catalog endpoints; Redis cache for product queries |
| **Page weight** | < 500 KB (homepage) | Code splitting; `next/dynamic` for heavy components (carousel, map); tree-shaking |
| **Time to Interactive** | < 3.5s | Prefetch links on viewport; defer cart drawer code until opened |

### 11.3 Loading States

- **Skeleton loaders** for product grids, product detail, search results (gray pulsing boxes matching layout)
- **Page transitions** — NProgress-style top bar (already in admin layout, reuse pattern)
- **Image fade-in** — images fade in on load (CSS opacity transition from 0 to 1)
- **Infinite scroll** or **Load More button** for catalog (no full page reload)
- **Optimistic UI** — add to cart updates badge immediately, reverts on API error
- **Route prefetching** — Next.js `<Link prefetch>` on product cards and navigation items

### 11.4 Caching Strategy

| Layer | What | TTL |
|-------|------|-----|
| **Next.js ISR** | Homepage, category pages, product pages | 60 seconds revalidate |
| **Next.js client cache** | SWR with `dedupingInterval` for catalog data | 60 seconds |
| **Laravel response cache** | `GET /store/{slug}/products`, `/categories`, `/brands` | 5 minutes (Redis) |
| **Laravel query cache** | Category tree, tenant settings, brand list | 1 hour (Redis) |
| **Browser cache** | Product images | 1 year (immutable, hashed filenames) |
| **Service Worker** (Phase 2) | Static assets, offline catalog browsing | — |

### 11.5 Lazy Loading Strategy — Content First, Images Later

The storefront prioritizes **text and layout rendering first**, then loads images **after** the content is visible. This gives the user instant perceived speed — they see product names, prices, and structure immediately, while images stream in progressively. This is critical for slow mobile connections (common in the BD market) where images can take seconds to download.

#### Core Principle

```
Page Navigation
      │
      ▼
┌───────────────────────────┐
│  1. HTML + Text Content    │  ← Loads FIRST (SSR/ISR from Next.js)
│     (product names, prices, │     User sees content immediately
│      layout, buttons, nav)  │
└──────────────┬────────────┘
               │
               ▼
┌───────────────────────────┐
│  2. Skeleton Image Place-  │  ← Loads INSTANTLY (inline CSS/SVG)
│     holders (gray boxes    │     No network request; zero blocking
│      with fixed aspect     │
│      ratio)                │
└──────────────┬────────────┘
               │
               ▼
┌───────────────────────────┐
│  3. LQIP Blur Placeholder  │  ← Loads EARLY (tiny ~200 byte image)
│     (blurry low-quality    │     Inline in HTML or immediate fetch
│      image preview)        │     Shows rough visual within 100ms
└──────────────┬────────────┘
               │
               ▼  (on viewport intersection — IntersectionObserver)
┌───────────────────────────┐
│  4. Full Image (WebP)      │  ← Loads LATER (only when scrolled into view)
│     (fades in from blur →  │     Lazy-loaded; non-blocking; progressive
│      sharp)                │     enhancement over the LQIP
└───────────────────────────┘
```

#### Technique 1: Next.js Image with `loading="lazy"` + `priority`

`next/image` is the foundation. By default it uses `loading="lazy"` (native browser lazy loading via IntersectionObserver). Only **above-the-fold** images get `priority` to preload immediately.

```tsx
// Above the fold (hero banner, first row of products) — PRIORITY
<Image
  src={product.primary_image}
  alt={product.name}
  width={400}
  height={400}
  priority              // ← loads immediately with the page
  placeholder="blur"
  blurDataURL={product.lqip}   // ← tiny blur placeholder shown instantly
  sizes="(max-width: 768px) 50vw, 200px"
  className="transition-opacity duration-300"
/>

// Below the fold (rest of product grid, related products) — LAZY
<Image
  src={product.primary_image}
  alt={product.name}
  width={400}
  height={400}
  // no priority → defaults to loading="lazy"
  placeholder="blur"
  blurDataURL={product.lqip}
  sizes="(max-width: 768px) 50vw, 200px"
  className="transition-opacity duration-300"
/>
```

#### Technique 2: LQIP (Low-Quality Image Placeholder) — Blur Preview

The backend generates a **tiny (~200 byte, 20x20px) blurred WebP** for every product image on upload. This is embedded as a `data:` URI (base64) directly in the HTML response — so the user sees a blurry preview **instantly** with zero additional network requests. When the full image loads, it fades in from blurry to sharp.

```
Backend (Laravel — on product image upload):
  1. Save original image (e.g., 1200x1200 WebP, 150 KB)
  2. Generate LQIP: resize to 20x20px, quality 20, WebP → ~200 bytes
  3. Base64-encode the LQIP → store in product_images.lqip_data column
  4. Return lqip_data in API response alongside file_url

API response:
  {
    "file_url": "https://cdn.example.com/products/iphone-15.webp",
    "lqip": "data:image/webp;base64,UklGRkQAAABXRUJQVlA4WAoAAAAQAAA...",
    "alt_text": "iPhone 15 Pro front view",
    "is_primary": true
  }

Frontend:
  <Image
    src={image.file_url}
    blurDataURL={image.lqip}    // ← inline base64, zero network cost
    placeholder="blur"
    // ... full image loads later and fades from blur → sharp
  />
```

#### Technique 3: Content Placeholder (Skeleton) Before Data Arrives

For pages that fetch data client-side (search results, filtered catalog), show a **skeleton layout** with text-like gray blocks **before** the API response arrives. This makes the page feel instantly loaded even while waiting for data.

```tsx
// Product grid skeleton (shown while SWR fetches data)
function ProductGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          {/* Image placeholder — gray box with correct aspect ratio */}
          <div className="bg-gray-200 dark:bg-gray-700 aspect-square rounded-lg w-full" />
          {/* Text placeholders — lines that appear instantly */}
          <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="mt-1 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="mt-2 h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

// Usage in catalog page
function CatalogPage() {
  const { data, isLoading } = useSWR('/store/slug/products', fetcher);

  if (isLoading) return <ProductGridSkeleton />;
  return <ProductGrid products={data} />;
}
```

#### Technique 4: IntersectionObserver — Only Load Images When Visible

For long product grids (infinite scroll / load more), images are only fetched when the product card **enters the viewport**. This is handled automatically by `next/image`'s `loading="lazy"`, but for custom components (carousels, off-canvas cart drawer), we use explicit IntersectionObserver:

```tsx
function LazyImage({ src, lqip, alt }: { src: string; lqip: string; alt: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();  // ← stop observing once loaded
        }
      },
      { rootMargin: '200px' }     // ← start loading 200px before visible (preloads)
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Always show LQIP blur (inline base64, instant) */}
      <img
        src={lqip}
        alt=""
        aria-hidden
        className="w-full h-full object-cover blur-xl scale-105 transition-opacity duration-500"
      />
      {/* Full image loads only when visible */}
      {isVisible && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, 200px"
          className="object-cover absolute inset-0 transition-opacity duration-500"
        />
      )}
    </div>
  );
}
```

#### Technique 5: Content Priority in HTML (Critical Text First)

Next.js SSR/ISR sends the **full HTML with text content** on the first response. Images are referenced as `<img>` tags with lazy attributes — the browser parses the HTML, renders text immediately, and defers image loading. This is automatic with App Router server components.

```
Browser receives HTML:
  ┌──────────────────────────────────────────────────┐
  │  <h2>iPhone 15 Pro</h2>         ← text, rendered instantly  │
  │  <span>$999.00</span>           ← price, rendered instantly  │
  │  <img loading="lazy"            ← image, deferred            │
  │       src="cdn.../iphone.webp"                                │
  │       placeholder="blur" ... />                               │
  │  <button>Add to Cart</button>   ← button, rendered instantly │
  └──────────────────────────────────────────────────┘

Result: User sees "iPhone 15 Pro $999.00 [Add to Cart]" immediately.
        The image area shows a blurred gray box.
        The full image streams in ~200ms later and fades from blur → sharp.
```

#### Technique 6: Deferred Non-Critical JavaScript

Heavy components (cart drawer, payment form, review form, carousel) are loaded **on demand** using `next/dynamic` with `ssr: false`. This keeps the initial JS bundle small so the browser can parse + render text content faster.

```tsx
import dynamic from 'next/dynamic';

// Cart drawer — only loaded when user clicks the bag icon
const CartDrawer = dynamic(() => import('./CartDrawer'), {
  ssr: false,                    // ← not rendered on server (no SEO need)
  loading: () => <div className="w-96 bg-white animate-pulse" />,  // skeleton while loading
});

// Payment form — only loaded on checkout page
const PaymentForm = dynamic(() => import('./PaymentForm'), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded" />,
});

// Review form — only loaded when user clicks "Write Review"
const ReviewForm = dynamic(() => import('./ReviewForm'), {
  ssr: false,
});

// Image carousel (embla) — only on product detail page
const ProductCarousel = dynamic(() => import('./ProductCarousel'), {
  ssr: false,
  loading: () => <div className="aspect-square bg-gray-100 animate-pulse rounded-lg" />,
});
```

#### Technique 7: Font Loading — Text Visible Immediately

Fonts are preloaded but text is shown with a fallback system font **immediately**, then swapped to the custom font when it loads (FOUT — Flash of Unstyled Text). This ensures text content is never invisible.

```tsx
// app/(storefront)/layout.tsx
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',          // ← show fallback font immediately, swap when loaded
  variable: '--font-inter',
  preload: true,
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',          // ← FOUT: text visible with fallback, then swaps
  variable: '--font-poppins',
  preload: true,
});

// Body uses fallback → custom font swaps in (no invisible text)
<html className={`${inter.variable} ${poppins.variable}`}>
  <body className="font-sans">  {/* font-sans = var(--font-inter), falls back to system-ui */}
```

#### Technique 8: Route-Level Code Splitting

Each page only loads its own code. The homepage doesn't load checkout code; the product detail page doesn't load catalog filter code. Next.js App Router does this automatically via per-route chunking, but we ensure heavy shared components are also split:

```
Route bundle sizes (estimated):

  / (homepage)           ~80 KB JS  (hero, product grid, nav)
  /products (catalog)    ~95 KB JS  (filters, sort, grid, pagination)
  /products/[slug]       ~70 KB JS  (gallery, variations, reviews trigger)
  /checkout              ~120 KB JS (form, validation, payment gateway SDK)
  /account/*             ~60 KB JS  (dashboard, orders, wishlist)
  /search                ~50 KB JS  (search bar, results grid)

  Cart drawer:           ~15 KB JS  (loaded on demand via dynamic import)
  Payment SDK (bKash):   ~30 KB JS  (loaded only on checkout page)
```

#### Loading Priority Summary

```
Priority    What                          When                           Technique
─────────   ─────────────────────────    ──────────────────────────     ─────────────────────
P0 (now)    HTML + text content          First HTML response            Next.js SSR/ISR
P0 (now)    Critical CSS (layout)        Inlined in <head>              Next.js built-in
P0 (now)    Skeleton placeholders        Instant (inline CSS)           CSS animation
P0 (now)    LQIP blur previews           Instant (base64 in HTML)       Backend generates
P0 (now)    System font text             Instant (browser default)      font-display: swap
P1 (early)  Above-fold images            Immediately after HTML         next/image priority
P1 (early)  Custom fonts                 ~200ms after page              font preload + swap
P2 (later)  Below-fold images            On scroll into viewport        loading="lazy" + IO
P2 (later)  Cart drawer JS               On cart icon click             next/dynamic ssr:false
P2 (later)  Payment SDK JS               On checkout page               next/dynamic ssr:false
P3 (idle)   Related products             After main content              useEffect deferred
P3 (idle)   Search autocomplete index    After first interaction        Prefetch on focus
P3 (idle)   Route prefetch (next page)   On link hover/viewport         <Link prefetch>
```

#### Backend: LQIP Generation (Laravel)

Add LQIP generation to the existing product image upload flow:

```php
// app/Services/ProductImageService.php (or new StoreImageService)

public function generateLqip(string $imagePath): string
{
    // Resize to 20x20px, quality 20, WebP format → ~200 bytes
    $lqip = Image::make($imagePath)
        ->resize(20, 20)
        ->encode('webp', 20)
        ->encoded;

    return 'data:image/webp;base64,' . base64_encode($lqip);
}

// On image upload:
$image = ProductImage::create([
    'product_id'  => $productId,
    'file_path'   => $storedPath,
    'file_url'    => $url,
    'lqip_data'   => $this->generateLqip($storedPath),  // ← NEW column
    'alt_text'    => $altText,
    'is_primary'  => $isPrimary,
    'sort_order'  => $sortOrder,
]);
```

New column on `product_images`:
```php
Schema::table('product_images', function (Blueprint $table) {
    $table->text('lqip_data')->nullable()->after('file_url');  // base64 LQIP
});
```

Storefront API includes `lqip` in image responses:
```json
{
  "id": "...",
  "file_url": "https://cdn.example.com/products/iphone-15.webp",
  "lqip": "data:image/webp;base64,UklGRkQAAABXRUJQVlA4WAoAAAAQ...",
  "alt_text": "iPhone 15 Pro front view",
  "is_primary": true
}
```

#### Measured Impact (Expected)

| Metric | Without Lazy Loading | With Content-First Lazy Loading |
|--------|---------------------|-------------------------------|
| **Text visible** | 2.5s (waits for all images) | **0.3s** (SSR HTML) |
| **LQIP blur visible** | N/A | **0.3s** (inline base64) |
| **First image sharp** | 2.5s | **0.5s** (priority above-fold) |
| **All images sharp** | 4.0s | **2.0s** (lazy on scroll) |
| **Page interactive** | 3.0s | **1.0s** (deferred JS) |
| **JS transferred (homepage)** | 250 KB | **80 KB** (code splitting) |
| **Lighthouse score** | ~50 | **~90** |

---

## 12. Admin Portal: Ecommerce Control

### 12.1 New Admin Pages

The UIMS admin portal (`app/(protected)/`) gets new sections for managing the storefront:

```
app/(protected)/
├── ecommerce/                      ← NEW: ecommerce management
│   ├── page.tsx                    ← ecommerce dashboard (sales stats)
│   ├── settings/
│   │   └── page.tsx                ← store configuration
│   ├── categories/
│   │   └── page.tsx                ← category visibility toggle
│   ├── products/
│   │   └── page.tsx                ← product visibility + ecommerce fields
│   ├── orders/
│   │   └── page.tsx                ← ecommerce orders (filtered sales orders)
│   ├── reviews/
│   │   └── page.tsx                ← review moderation
│   ├── coupons/
│   │   └── page.tsx                ← coupon/discount management
│   ├── banners/
│   │   └── page.tsx                ← homepage banner management
│   └── shipping/
│       └── page.tsx                ← shipping zones + rates
```

### 12.2 Store Settings (Admin)

New fields added to `tenant_settings`:

```php
// New columns in tenant_settings table
ecommerce_enabled BOOLEAN DEFAULT FALSE
ecommerce_store_name VARCHAR(255) NULL
ecommerce_store_description TEXT NULL
ecommerce_contact_email VARCHAR(255) NULL
ecommerce_contact_phone VARCHAR(50) NULL
ecommerce_address TEXT NULL
ecommerce_currency VARCHAR(10) DEFAULT 'BDT'
ecommerce_currency_symbol VARCHAR(10) DEFAULT '৳'
ecommerce_low_stock_threshold INT DEFAULT 5
ecommerce_out_of_stock_behavior ENUM('hide','show','show_with_label') DEFAULT 'show_with_label'
ecommerce_tax_display ENUM('included','excluded') DEFAULT 'excluded'
ecommerce_tax_rate DECIMAL(5,2) DEFAULT 0.00
ecommerce_min_order_amount DECIMAL(10,2) DEFAULT 0.00
ecommerce_free_shipping_threshold DECIMAL(10,2) NULL
ecommerce_default_delivery_days INT DEFAULT 3
ecommerce_social_facebook VARCHAR(255) NULL
ecommerce_social_instagram VARCHAR(255) NULL
ecommerce_social_twitter VARCHAR(255) NULL
ecommerce_social_youtube VARCHAR(255) NULL
ecommerce_payment_gateways JSON NULL  // ["sslcommerz","bkash","nagad","cod","bank_transfer"]
ecommerce_gateway_credentials JSON NULL  // encrypted per-gateway credentials
```

### 12.3 Category Visibility Control

The admin can control which categories appear on the storefront:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Storefront Category Visibility                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ☑ Electronics                                                       │
│    ☑ Mobile                                                          │
│      ☑ Smartphones                                                   │
│      ☑ Cases                                                         │
│      ☐ Accessories (hidden from storefront)                        │
│    ☑ Laptop                                                          │
│    ☑ Audio                                                           │
│  ☑ Fashion                                                           │
│    ☑ Men                                                             │
│    ☑ Women                                                           │
│  ☐ Grocery (entire category hidden)                                 │
│                                                                      │
│  [Save Visibility Settings]                                         │
└──────────────────────────────────────────────────────────────────────┘
```

**Backend:** New `store_category_visibility` table:
```php
Schema::create('store_category_visibility', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->string('category_id');
    $table->boolean('is_visible')->default(true);
    $table->integer('display_order')->default(0);
    $table->timestamps();
    $table->unique(['tenant_id', 'category_id']);
});
```

The storefront API `GET /store/{slug}/categories` only returns categories where `is_visible = true`.

### 12.4 Product Ecommerce Fields

Products already have `status`, `is_featured`, `is_new`, `is_bestseller`, `is_on_sale`, `meta_title`, `meta_description`, `slug` — these are used by the storefront. The admin can:

1. Set `status = 'active'` to make a product visible on the storefront
2. Toggle `is_featured` / `is_new` / `is_bestseller` / `is_on_sale` to control homepage sections
3. Edit `short_description` and `description` for storefront display
4. Edit SEO meta fields (`meta_title`, `meta_description`, `meta_keywords`)
5. Set `available_from` / `available_until` for scheduled visibility
6. Set `display_order` for sorting

**New admin fields (if needed):**
```php
// Optional new columns on products table
is_ecommerce_visible BOOLEAN DEFAULT TRUE  // separate from status for granular control
ecommerce_sort_order INT DEFAULT 0
```

---

## 13. Notifications System

### 13.1 Automated Notifications

| Event | Channel | Trigger | Content |
|-------|---------|---------|---------|
| Order placed | Email + SMS | `sales_order.created` | Order confirmation + UUID |
| Order confirmed | Email | Admin confirms order | "Your order is confirmed" |
| Order packed | Email | Admin marks as packed | "Your order is being prepared" |
| Order shipped | Email + SMS | Admin marks as shipped + adds tracking | "Your order has shipped" + tracking link |
| Order delivered | Email | Admin/courier marks as delivered | "Your order has been delivered" + review request |
| Order cancelled | Email + SMS | Customer or admin cancels | "Order cancelled" + refund info |
| Return requested | Email | Customer requests return | "Return request received" |
| Return approved/denied | Email | Admin processes return | Decision + instructions |
| Refund processed | Email + SMS | Admin processes refund | "Refund of $X processed" |
| Payment received | Email | Payment gateway verifies | "Payment received" + receipt link |
| Back in stock | Email | Stock updated for wishlisted item | "X is back in stock" |
| Price drop | Email | Price reduced for wishlisted item | "X price dropped from $A to $B" |
| Abandoned cart | Email | Cart inactive 24 hours | "You left items in your bag" |
| Review request | Email | 7 days after delivery | "How was your purchase?" + review link |

### 13.2 Notification Implementation

```
Backend:
  Laravel Events: OrderPlaced, OrderShipped, PaymentVerified, etc.
  Listeners: SendOrderNotification (dispatches to channels)
  Channels: Email (Laravel Mail), SMS (gateway API — SSLCommerz SMS, Twilio)
  Queue: All notifications dispatched to queue for async processing

  Config (store_settings):
    notification_channels: { email: true, sms: false }
    sms_gateway: "sslcommerz" | "twilio" | null
    sms_gateway_credentials: { ... }
    abandoned_cart_enabled: true
    abandoned_cart_delay_hours: 24
```

### 13.3 In-App Notifications

Logged-in customers see a notification bell in the header:

```
┌───────────────────┐
│  🔔 (3)           │
├───────────────────┤
│  ✓ Order #00123   │
│    delivered      │
│  2 hours ago      │
├───────────────────┤
│  ⚠ Price drop on  │
│    wishlist item  │
│  5 hours ago      │
├───────────────────┤
│  📦 Order #00118  │
│    shipped        │
│  1 day ago        │
└───────────────────┘
```

---

## 14. Reviews & Ratings

### 14.1 Review System

```
Backend:
  Table: product_reviews
    id, tenant_id, product_id, variation_id?, customer_id, order_id,
    rating (1-5), title, body, images JSON?,
    is_verified_purchase BOOLEAN,  // true if customer bought this product
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    admin_response TEXT NULL,
    created_at, updated_at

  API:
    POST /api/v1/store/customer/reviews  (auth: customer, verified purchase only)
    GET  /api/v1/store/{slug}/products/{id}/reviews  (public, approved only)
    Admin: /api/v1/ecommerce/reviews (moderation queue)
```

### 14.2 Review Display

On product detail page:
- Average rating (e.g., ⭐ 4.8 out of 5, 124 reviews)
- Rating distribution bar chart (5★: 80%, 4★: 12%, 3★: 5%, 2★: 2%, 1★: 1%)
- Individual reviews with name, date, verified purchase badge, photos
- Sort reviews by: Most recent, Most helpful, Highest rating, Lowest rating
- "Write a Review" button (only for verified purchases who haven't reviewed yet)
- Admin response shown below customer review

### 14.3 Review Moderation

Admin portal (`app/(protected)/ecommerce/reviews/`):
- Pending reviews queue (approve / reject)
- Flagged reviews (reported by customers)
- Reply to reviews (admin response)
- Bulk approve/reject

---

## 15. Shipping & Tax

### 15.1 Shipping Configuration

```
Backend:
  Table: store_shipping_zones
    id, tenant_id, name, cities JSON,  // ["Dhaka","Chittagong","Sylhet"]
    shipping_methods JSON,  // [{ name: "Standard", rate: 5.00, estimated_days: 2-3 },
                             //  { name: "Express", rate: 15.00, estimated_days: 1 }]
    is_active, created_at, updated_at

  Table: store_shipping_methods (alternative normalized approach)
    id, zone_id, name, description, rate, estimated_days_min, estimated_days_max,
    is_active, sort_order

  Settings:
    ecommerce_free_shipping_threshold  // null = no free shipping; 500 = free over $500
```

### 15.2 Shipping Calculation

```
Frontend → POST /api/v1/store/checkout/calculate-shipping
  Body: { city: "Dhaka", cart_total: 107.00 }
  → 200: { methods: [
      { id: 1, name: "Standard Delivery", rate: 5.00, estimated_days: "2-3 days" },
      { id: 2, name: "Express Delivery", rate: 15.00, estimated_days: "1 day" },
      { id: 3, name: "Free Shipping", rate: 0.00, estimated_days: "2-3 days" }  // if cart_total >= threshold
    ] }
```

### 15.3 Tax Configuration

```
Settings:
  ecommerce_tax_display: 'included' | 'excluded'
  ecommerce_tax_rate: 5.00  // percentage
  store_tax_included: true/false (existing setting)

  If 'included': prices shown on storefront include tax; tax line in cart is informational
  If 'excluded': prices shown exclude tax; tax added at checkout
  Per-product override: Product.tax_rate (if set, overrides tenant default)
  Tax-exempt products: Product.is_taxable = false
```

---

## 16. Coupons & Discounts

### 16.1 Coupon System

```
Backend:
  Table: store_coupons
    id, tenant_id, code, description,
    type ENUM('percentage','fixed'),
    value DECIMAL(10,2),  // 10.00 = 10% or $10.00
    min_order_amount DECIMAL(10,2) NULL,
    max_discount_amount DECIMAL(10,2) NULL,
    usage_limit INT NULL,  // total times usable
    usage_limit_per_customer INT DEFAULT 1,
    used_count INT DEFAULT 0,
    valid_from DATETIME,
    valid_until DATETIME,
    is_active BOOLEAN,
    applies_to ENUM('all','category','brand','product'),
    category_id NULL, brand_id NULL, product_id NULL,
    created_at, updated_at

  API:
    POST /api/v1/store/checkout/validate-coupon
      Body: { code: "SUMMER20", cart_total: 107.00, items: [...] }
      → 200: { valid: true, discount_amount: 21.40, description: "20% off" }
      → 200: { valid: false, error: "Coupon expired" }

  Admin:
    app/(protected)/ecommerce/coupons/page.tsx — CRUD for coupons
```

---

## 17. Frontend Service Layer (New)

### 17.1 Storefront Services

All new service files follow the existing singleton class pattern (`apiClient` from `@/lib/api/axios`):

```
services/
├── storefront/                          ← NEW: all storefront services
│   ├── index.ts                         ← barrel export
│   ├── storeCatalogService.ts           ← products, categories, brands (public, no auth)
│   ├── storeAuthService.ts              ← customer login/register/me/logout
│   ├── storeCartService.ts              ← cart sync (for logged-in users)
│   ├── storeCheckoutService.ts          ← place order, calculate shipping, validate coupon
│   ├── storePaymentService.ts           ← payment initiation + verification
│   ├── storeOrderService.ts             ← order history, tracking, cancel, return
│   ├── storeWishlistService.ts          ← wishlist CRUD
│   ├── storeReviewService.ts            ← reviews list + create
│   ├── storeSearchService.ts            ← search + autocomplete
│   └── storeSettingsService.ts          ← tenant store config (public)
```

### 17.2 Storefront State (Zustand)

```
stores/
├── cart-store.ts          ← NEW: cart items, drawer open/close, coupon
├── customer-auth-store.ts ← NEW: customer user, token, isAuthenticated
├── wishlist-store.ts      ← NEW: wishlist item IDs (optimistic UI)
└── store-config-store.ts  ← NEW: tenant settings, currency, categories (cached)
```

### 17.3 Storefront Hooks

```
hooks/
├── use-customer-auth.ts    ← NEW: SWR on /store/customer/me
├── use-store-catalog.ts    ← NEW: SWR on catalog with filters
├── use-store-search.ts     ← NEW: debounced search hook
├── use-cart.ts             ← NEW: cart actions + derived totals
└── use-wishlist.ts         ← NEW: wishlist actions
```

---

## 18. Backend API Endpoints (Complete List)

### 18.1 Public (No Auth)

```
GET  /api/v1/store/{slug}/settings                → store config (name, currency, logo, etc.)
GET  /api/v1/store/{slug}/categories              → visible category tree
GET  /api/v1/store/{slug}/brands                  → brand list
GET  /api/v1/store/{slug}/products                → paginated catalog (filters: category, brand, price, attr, sort, page)
GET  /api/v1/store/{slug}/products/{slug}         → product detail (variations, images, stock, reviews)
GET  /api/v1/store/{slug}/products/featured       → featured products (is_featured = true)
GET  /api/v1/store/{slug}/products/bestsellers    → bestseller products (is_bestseller = true)
GET  /api/v1/store/{slug}/products/new-arrivals   → new products (is_new = true)
GET  /api/v1/store/{slug}/products/on-sale        → on-sale products (is_on_sale = true)
GET  /api/v1/store/{slug}/search                  → search results (q, filters, pagination)
GET  /api/v1/store/{slug}/search/autocomplete     → autocomplete suggestions (q)
GET  /api/v1/store/{slug}/products/{slug}/reviews → approved reviews for a product
GET  /api/v1/store/{slug}/banners                 → homepage banners (admin-managed)
POST /api/v1/store/checkout/calculate-shipping    → shipping methods for city + cart total
POST /api/v1/store/checkout/validate-coupon       → validate coupon code
```

### 18.2 Customer Auth

```
POST /api/v1/store/customer/register              → { name, email, phone, password, tenant_slug }
POST /api/v1/store/customer/login                 → { email, password, tenant_slug }
POST /api/v1/store/customer/forgot-password       → { email }
POST /api/v1/store/customer/reset-password        → { email, token, password }
GET  /api/v1/store/customer/me                    → customer profile
POST /api/v1/store/customer/logout
PUT  /api/v1/store/customer/profile               → update name, phone
PUT  /api/v1/store/customer/password              → change password
```

### 18.3 Customer Actions (Auth Required)

```
GET  /api/v1/store/customer/wishlist              → wishlist items
POST /api/v1/store/customer/wishlist/add          → { variation_id }
POST /api/v1/store/customer/wishlist/remove       → { variation_id }
GET  /api/v1/store/customer/addresses             → saved addresses
POST /api/v1/store/customer/addresses             → add address
PUT  /api/v1/store/customer/addresses/{id}        → update address
DELETE /api/v1/store/customer/addresses/{id}      → delete address
GET  /api/v1/store/customer/orders                → order history (paginated)
GET  /api/v1/store/customer/orders/{uuid}         → order detail + tracking
POST /api/v1/store/customer/orders/{uuid}/cancel  → cancel order (before shipped)
POST /api/v1/store/customer/orders/{uuid}/return  → request return
POST /api/v1/store/customer/reviews               → { product_id, rating, title, body, order_id }
GET  /api/v1/store/customer/notifications         → in-app notifications
```

### 18.4 Checkout (Guest + Auth)

```
POST /api/v1/store/checkout/place-order           → create SalesOrder + SalesOrderItems
POST /api/v1/store/checkout/payment/initiate      → initiate gateway payment
POST /api/v1/store/checkout/payment/verify        → verify gateway response (callback)
GET  /api/v1/store/checkout/payment/callback       → redirect URL after gateway payment
```

---

## 19. New Database Tables

### 19.1 Customer Auth

```php
// customer_users — auth identities for storefront customers
Schema::create('customer_users', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->unsignedBigInteger('customer_id');  // links to customers table
    $table->string('email')->unique();
    $table->string('phone')->nullable();
    $table->string('password');
    $table->rememberToken();
    $table->timestamp('email_verified_at')->nullable();
    $table->timestamp('last_login_at')->nullable();
    $table->timestamps();
    $table->foreign('tenant_id')->references('id')->on('tenants');
    $table->foreign('customer_id')->references('id')->on('customers');
});
```

### 19.2 Wishlist

```php
Schema::create('wishlists', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->unsignedBigInteger('customer_user_id');
    $table->string('product_id');
    $table->string('variation_id')->nullable();
    $table->timestamps();
    $table->unique(['customer_user_id', 'variation_id']);
});
```

### 19.3 Reviews

```php
Schema::create('product_reviews', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->string('product_id');
    $table->string('variation_id')->nullable();
    $table->unsignedBigInteger('customer_user_id');
    $table->unsignedBigInteger('order_id')->nullable();  // for verified purchase
    $table->unsignedTinyInteger('rating');  // 1-5
    $table->string('title');
    $table->text('body');
    $table->json('images')->nullable();
    $table->boolean('is_verified_purchase')->default(false);
    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
    $table->text('admin_response')->nullable();
    $table->timestamps();
});
```

### 19.4 Store Settings (added to tenant_settings)

See §12.2 for the full column list.

### 19.5 Store Category Visibility

See §12.3.

### 19.6 Coupons

See §16.1.

### 19.7 Shipping Zones

See §15.1.

### 19.8 Banners

```php
Schema::create('store_banners', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->string('title');
    $table->string('image_url');
    $table->string('link_url')->nullable();
    $table->string('position');  // 'hero', 'promo_left', 'promo_right', 'category_strip'
    $table->integer('sort_order')->default(0);
    $table->timestamp('valid_from')->nullable();
    $table->timestamp('valid_until')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### 19.9 Payment Transactions

```php
Schema::create('payment_transactions', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->unsignedBigInteger('sales_order_id');
    $table->string('gateway');  // sslcommerz, bkash, nagad, stripe, cod, bank_transfer
    $table->string('transaction_id')->nullable();
    $table->string('gateway_transaction_id')->nullable();
    $table->decimal('amount', 10, 2);
    $table->string('currency', 10)->default('BDT');
    $table->enum('status', ['initiated', 'pending', 'completed', 'failed', 'refunded', 'cancelled'])
          ->default('initiated');
    $table->json('gateway_response')->nullable();
    $table->timestamp('initiated_at');
    $table->timestamp('completed_at')->nullable();
    $table->timestamps();
});
```

### 19.10 Abandoned Carts

```php
Schema::create('abandoned_carts', function (Blueprint $table) {
    $table->id();
    $table->string('tenant_id');
    $table->string('email')->nullable();
    $table->string('phone')->nullable();
    $table->unsignedBigInteger('customer_user_id')->nullable();
    $table->json('cart_data');  // snapshot of cart items
    $table->decimal('cart_total', 10, 2);
    $table->timestamp('abandoned_at');
    $table->timestamp('recovery_email_sent_at')->nullable();
    $table->timestamps();
});
```

---

## 20. New Backend Services (Laravel)

```
app/Services/
├── Storefront/
│   ├── CatalogService.php          → product listing, detail, featured/bestseller/new queries
│   ├── SearchService.php           → search + autocomplete (LIKE or Meilissearch)
│   ├── CategoryTreeService.php     → visible category tree builder
│   ├── StoreSettingsService.php    → tenant store config
│   ├── CheckoutService.php         → order creation, stock reservation, coupon validation
│   ├── ShippingService.php         → shipping zone/method calculation
│   ├── TaxService.php              → tax calculation (included/excluded)
│   ├── CouponService.php           → coupon validation + application
│   ├── ReviewService.php           → review creation + moderation
│   ├── WishlistService.php         → wishlist CRUD
│   ├── CustomerAuthService.php     → customer registration, login, token
│   ├── NotificationService.php     → email + SMS dispatch
│   └── AbandonedCartService.php    → cart recovery emails
├── Payment/
│   ├── PaymentGatewayService.php   → factory/manager (resolves gateway by name)
│   ├── PaymentGatewayInterface.php → contract
│   ├── SslCommerzGateway.php
│   ├── BkashGateway.php
│   ├── NagadGateway.php
│   ├── StripeGateway.php
│   ├── CodGateway.php
│   └── BankTransferGateway.php
└── (existing services remain unchanged)
```

---

## 21. Implementation Phases

### Phase 1: MVP (4-5 weeks)

**Goal:** A working storefront with browse, cart, checkout (COD + bKash), and order placement.

| Week | Deliverables |
|------|-------------|
| 1 | Backend: Customer auth guard, `store_settings` migration, public storefront API endpoints (settings, categories, products, brands), `CatalogService` |
| 1 | Frontend: Storefront layout, header (logo, nav, search bar, cart icon), homepage (hero + featured products), product card component |
| 2 | Frontend: Product detail page (gallery, variations, add to cart), catalog page (filters, sort, pagination) |
| 2 | Frontend: Cart drawer (Zustand store, persistent, add/remove/quantity), cart page |
| 3 | Frontend: Checkout page (guest + auth, shipping address, COD + bKash payment), order placement flow |
| 3 | Backend: `CheckoutService` (creates SalesOrder + items + reserves stock), bKash gateway integration |
| 4 | Frontend: Customer login/register pages, account dashboard, order history + tracking page |
| 4 | Backend: Customer order endpoints, order status flow, email notifications (order confirmation, shipped, delivered) |
| 5 | Admin: Store settings page, category visibility toggle, ecommerce orders view |
| 5 | Testing, bug fixes, performance optimization, image optimization |

### Phase 2: Growth (3-4 weeks)

| Week | Deliverables |
|------|-------------|
| 6 | Wishlist, reviews (create + display + moderation), related products |
| 7 | SSLCommerz gateway, Nagad gateway, coupon system, free shipping threshold |
| 8 | Smart search (autocomplete, typo tolerance if Meilisearch), search results page with facets |
| 9 | Abandoned cart recovery, price drop / back-in-stock notifications, in-app notification bell |

### Phase 3: Scale (2-3 weeks)

| Week | Deliverables |
|------|-------------|
| 10 | One-click checkout (express), saved addresses, order returns flow |
| 11 | Banners management (admin), homepage customization, SEO optimization (structured data, sitemap) |
| 12 | Stripe gateway, performance tuning (ISR, Redis caching, CDN), analytics dashboard |

---

## 22. Tech Stack Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js 16 (App Router) | Already in use; SSR/ISR for SEO + performance |
| State (cart, auth) | Zustand + persist | Already in project; lightweight; no boilerplate |
| Data fetching | SWR | Already in project; caching, revalidation, dedup |
| Forms | react-hook-form + zod | Industry standard; performant; schema validation |
| Styling | Tailwind CSS 4 | Already in use; consistent with admin |
| UI components | Custom + Headless UI | Match Pickbazar aesthetic; full control |
| Image optimization | `next/image` | Built into Next.js; automatic WebP, srcset, lazy |
| Carousel | Embla Carousel | Lightweight, performant, React-friendly |
| Icons | lucide-react | Already in use |
| Notifications (UI) | SweetAlert2 + toast | Already in use (`@/lib/notifications`) |
| Search (MVP) | Laravel LIKE + trigram | No extra infrastructure; works for < 50K products |
| Search (scale) | Meilisearch | Self-hosted; typo tolerance; instant; Laravel Scout integration |
| Charts (admin) | Recharts | Already in use |
| PDF (invoice) | jsPDF + html2canvas | Already in use |
| Payment | SSLCommerz + bKash + Nagad | Local BD market focus; Stripe for international (Phase 3) |
| Email | Laravel Mail (SMTP) | Transactional emails via configured SMTP |
| SMS | SSLCommerz SMS / Twilio | Order notifications |
| Caching | Redis (Laravel Cache) | Catalog caching, session, queue |
| Queue | Laravel Queue (Redis/Database) | Async notifications, payment verification, abandoned cart |

---

## 23. SEO & Marketing

### 23.1 SEO

| Feature | Implementation |
|---------|---------------|
| **Meta tags** | `generateMetadata()` per page from Product/Category meta fields |
| **Open Graph** | `og:title`, `og:description`, `og:image` from product data |
| **Twitter Cards** | `twitter:card` summary_large_image |
| **Structured data** | JSON-LD: `Product` (name, image, price, availability, rating), `BreadcrumbList`, `Organization` |
| **Sitemap** | `app/sitemap.ts` → dynamic sitemap from all active products + categories |
| **robots.txt** | `app/robots.ts` → allow all, reference sitemap |
| **URLs** | SEO-friendly slugs: `/{slug}/products/iphone-15-pro` (not IDs) |
| **Canonical** | `<link rel="canonical">` on all pages |
| **Page speed** | Core Web Vitals targets (§11.2) |
| **Schema** | Product schema with price, availability, rating, reviews |

### 23.2 Marketing Features (Phase 2+)

- **Flash sales** — time-limited discount events with countdown timer
- **Email campaigns** — newsletter signup, promotional emails
- **Social sharing** — share buttons on product pages (Facebook, WhatsApp, Twitter)
- **Related products** — "You may also like" + "Frequently bought together"
- **Recently viewed** — track last 10 viewed products (localStorage)
- **Product comparisons** — compare up to 4 products side by side
- **Loyalty points** (Phase 3) — earn points on purchases, redeem for discounts

---

## 24. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Customer auth isolation** | Separate `customer` guard — customer tokens cannot access admin endpoints; admin tokens cannot access customer endpoints |
| **Tenant scoping** | All storefront queries scoped by `tenant_id` from URL slug — no cross-tenant data leakage |
| **Price manipulation** | Backend re-validates prices from `product_variations.selling_price` on order placement — never trust frontend prices |
| **Stock validation** | Backend checks `stocks.quantity - stocks.reserved_quantity >= requested_quantity` before confirming order |
| **Coupon abuse** | Per-customer usage limit; min order amount; expiry date; `used_count` increment with lock |
| **Payment verification** | Backend verifies payment with gateway API (not just frontend callback) before marking order as paid |
| **SQL injection** | Laravel Eloquent parameterized queries; never raw user input in SQL |
| **XSS** | React auto-escapes; product descriptions sanitized on backend (strip `<script>` tags) |
| **CSRF** | Sanctum cookie-based auth handles CSRF (existing pattern); customer endpoints also protected |
| **Rate limiting** | Search: 30 req/min per IP; auth: 5 attempts/min per IP; checkout: 3 orders/min per customer |
| **PII protection** | Customer emails/phones/addresses encrypted at rest (optional); access logged |
| **GDPR/compliance** | Customer can request data export + deletion; order data retained for tax compliance |
| **Payment credentials** | Gateway credentials stored encrypted in `store_settings`; never exposed to frontend |
| **Image upload** (reviews) | Validate type (jpg/png/webp), size (< 2MB), scan for malicious content; store on private disk |

---

## 25. Effort Estimate

| Phase | Duration | Team |
|-------|----------|------|
| **Phase 1: MVP** | 4-5 weeks | 1 backend dev + 1 frontend dev |
| **Phase 2: Growth** | 3-4 weeks | 1 backend dev + 1 frontend dev |
| **Phase 3: Scale** | 2-3 weeks | 1 backend dev + 1 frontend dev |
| **Total** | **9-12 weeks** | 2 developers |

### Detailed Breakdown

| Area | Description | Duration |
|------|-------------|----------|
| Backend: Customer auth | Guard, model, controller, routes, middleware | 3 days |
| Backend: Public catalog API | Products, categories, brands, settings endpoints + caching | 4 days |
| Backend: Checkout | Order creation, stock reservation, coupon, shipping calc, tax | 5 days |
| Backend: Payment gateways | bKash + SSLCommerz + COD + bank transfer | 5 days |
| Backend: Customer endpoints | Orders, wishlist, reviews, addresses, notifications | 4 days |
| Backend: Search | LIKE-based search + autocomplete (Meilisearch in Phase 2) | 2 days |
| Backend: Admin ecommerce | Settings UI, category visibility, review moderation, coupons, banners | 4 days |
| Backend: Notifications | Email templates, SMS integration, event listeners | 3 days |
| Frontend: Layout + header | Storefront shell, nav with multi-level dropdown, search bar, footer | 3 days |
| Frontend: Homepage | Hero carousel, category icons, product sections (featured/bestseller/new/sale) | 3 days |
| Frontend: Catalog | Product grid, filters sidebar, sort, pagination, URL state | 4 days |
| Frontend: Product detail | Gallery, variation selector, stock display, add to cart, reviews, related | 4 days |
| Frontend: Cart | Drawer + full page, Zustand store, persistent, quantity steppers | 3 days |
| Frontend: Checkout | Multi-step form, guest + auth, shipping method, payment method, order summary | 5 days |
| Frontend: Customer auth | Login, register, forgot password pages | 2 days |
| Frontend: Account | Dashboard, order history, order tracking, wishlist, addresses, settings | 4 days |
| Frontend: Search | Autocomplete dropdown, search results page, recent/popular searches | 3 days |
| Frontend: Performance | Image optimization, skeleton loaders, ISR, prefetching, code splitting | 3 days |
| Testing | E2E (checkout flow, auth, cart), unit (services), integration (order creation) | 5 days |
| **Total** | | **~67 days (13 weeks)** |

---

## 26. Out of Scope

This plan does NOT cover:
- **Multi-vendor marketplace** — each tenant has one storefront; no third-party sellers
- **Auction/bidding** — fixed price only
- **Subscription/recurring orders** — one-time purchases only (Phase 3+)
- **B2B bulk ordering** — the storefront is B2C; B2B uses the existing UIMS sales order flow
- **Physical store pickup with real-time inventory** — pickup is a shipping option, not real-time store inventory
- **Live chat** — can be added via third-party (Tawk.to, Intercom) but not built in-house
- **Mobile app** (native) — the storefront is responsive web; native apps are a separate project
- **AI-powered recommendations** — "related products" uses category/brand matching; ML recommendations are Phase 3+
- **Multi-currency** — one currency per tenant (from settings); multi-currency is Phase 3+
- **Multi-language** — one language per storefront initially; i18n is Phase 3+
- **AR/3D product views** — standard images only
- **Video on product pages** — images only initially
- **Social login** (Google/Facebook) — email/password only initially; social login is Phase 2

---

## 27. Relationship to Existing UIMS

| UIMS Entity | Storefront Usage | Changes Needed |
|-------------|-----------------|----------------|
| `Product` | Catalog, detail, search | No schema change; uses existing `status`, `is_featured`, `is_new`, `is_bestseller`, `is_on_sale`, `slug`, meta fields |
| `ProductVariation` | Pricing, stock check, cart items | No change; uses `selling_price`, `mrp`, `is_active` |
| `ProductImage` | Product gallery, thumbnails | No change; uses `file_url`, `is_primary`, `alt_text`, `sort_order` |
| `Category` | Navigation menu, filters, breadcrumbs | New `store_category_visibility` table for visibility control; add `slug` field |
| `Brand` | Brand filters, brand pages | No change; uses `name`, `slug`, `logo_url` |
| `Attribute` / `AttributeValue` | Variation selectors (color swatches, size buttons) | No change; uses `hex_code` for colors |
| `Stock` | Stock display, availability check | No change; uses `quantity`, `reserved_quantity` |
| `Customer` | Customer records for orders | No change; storefront creates `type: 'retail'` customers |
| `SalesOrder` | Ecommerce orders | No schema change; uses `shipping_address`, `shipping_method`, `shipping_charge`, `discount_*`, `tax_amount`, `grand_total` |
| `Payment` | Order payments | No change; payment methods already include card, bkash, nagad, etc. |
| `Tenant` | Storefront identity (slug, logo, theme) | No change; uses `slug`, `currency`, `theme_color` |
| `TenantSettings` | Store configuration | New `ecommerce_*` columns (see §12.2) |
| `BusinessType` | Product/category scoping | No change |
| `User` (staff) | Not used by storefront | No change — customer auth is separate (`customer_users` table) |

**Key principle:** The storefront is a **read consumer** of the existing UIMS catalog data and a **write producer** of `sales_orders`. It does not duplicate or modify the existing product/inventory schema — it only adds new tables for customer auth, wishlist, reviews, coupons, banners, and store settings.
