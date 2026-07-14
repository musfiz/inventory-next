# Ecommerce Management Module — Complete UI Plan (v2)

> Supersedes the v1 draft. Expands scope to cover **every** manageable aspect of the
> UIMS storefront (`app/(storefront)/`): activation, website/company data, localization,
> theme, homepage, navigation, catalog merchandising, content/CMS, promotions, orders,
> customers, reviews, analytics and integrations.
>
> Pattern reference: **same 3-layer structure as "Report Management"** in
> `components/layout/sidebar.tsx` — **Parent → Group → Leaf page**. No 4th level;
> anything deeper (e.g. "edit slide", "edit page") is a modal/drawer or a
> `/new`, `/[id]/edit` sub-route reached *from* a leaf page, not a menu entry.

---

## 1. Module Position in Sidebar

Insert as a **top-level item**, placed after **Accounting Management** and before
**Report Management** (storefront config is an operational area, reports read from it):

```ts
{ name: 'Ecommerce Management', icon: GiShop, superAdminOnly: true, children: [ ...11 groups... ] }
```

`superAdminOnly: true` on the **parent only** — mirrors the `Settings` entry. Only one
tenant runs the storefront at a time and it's toggled from the Tenant form
(`storefront_active`), so nobody but super admin should see/configure this menu in v1.
(`permission` fields can be added later per group if storefront management is delegated
to tenant admins.)

---

## 2. Complete 3-Layer Menu Tree

**11 groups → 41 leaf pages.** Every group and leaf below is a real sidebar node
(`name`, `icon`, `href` for leaves) exactly like Report Management's shape.

```
Ecommerce Management                                          (parent · superAdminOnly)
│
├── 1. Storefront Settings                                    (group)
│   ├── Status & Activation              → /ecommerce/settings/status
│   ├── Store / Company Information       → /ecommerce/settings/company        ← "website data"
│   ├── Localization & Currency           → /ecommerce/settings/localization   ← "locale"
│   ├── SEO & Meta Defaults               → /ecommerce/settings/seo
│   ├── Payment Methods                   → /ecommerce/settings/payments
│   └── Shipping & Delivery               → /ecommerce/settings/shipping
│
├── 2. Appearance & Branding                                   (group)
│   ├── Theme & Colors                    → /ecommerce/appearance/theme
│   ├── Logo & Favicon                    → /ecommerce/appearance/logo
│   ├── Header & Menu Builder             → /ecommerce/appearance/header-menu
│   └── Footer Builder                    → /ecommerce/appearance/footer
│
├── 3. Homepage Customization                                  (group)
│   ├── Hero Slider                       → /ecommerce/homepage/hero-slider
│   ├── Promotional Banners               → /ecommerce/homepage/banners
│   ├── Flash Sale / Countdown            → /ecommerce/homepage/flash-sale
│   ├── Featured Products                 → /ecommerce/homepage/featured
│   ├── Category Showcase                 → /ecommerce/homepage/categories
│   └── Trust Badges & Promo Strip        → /ecommerce/homepage/trust-badges
│
├── 4. Product Display & Merchandising                         (group)
│   ├── Display Settings                  → /ecommerce/products/display
│   ├── Storefront Visibility             → /ecommerce/products/visibility
│   ├── Featured / New / Bestseller Flags → /ecommerce/products/flags
│   ├── Category & Brand Page Content     → /ecommerce/products/category-content
│   └── Related / Cross-sell / Up-sell    → /ecommerce/products/relations
│
├── 5. Content & Pages                                         (group)
│   ├── Static Pages (CMS)                → /ecommerce/content/pages
│   ├── Announcement Bar                  → /ecommerce/content/announcement
│   ├── Blog / News (optional)            → /ecommerce/content/blog
│   └── Media Library                     → /ecommerce/content/media
│
├── 6. Promotions & Coupons                                    (group)
│   ├── Coupons                           → /ecommerce/promotions/coupons
│   ├── Flash Sale Campaigns              → /ecommerce/promotions/campaigns
│   └── Customer Group Pricing            → /ecommerce/promotions/group-pricing
│
├── 7. Storefront Orders                                       (group)
│   ├── All Orders                        → /ecommerce/orders
│   ├── Order Status Workflow             → /ecommerce/orders/status
│   ├── Returns & Refunds                 → /ecommerce/orders/returns
│   └── Shipping Zones & Rates            → /ecommerce/orders/shipping-zones
│
├── 8. Storefront Customers                                    (group)
│   ├── Customer List                     → /ecommerce/customers
│   ├── Customer Groups                   → /ecommerce/customers/groups
│   └── Wishlist Insights                 → /ecommerce/customers/wishlist-insights
│
├── 9. Reviews & Ratings                                       (group)
│   ├── Moderation Queue                  → /ecommerce/reviews/queue
│   └── Review Settings                   → /ecommerce/reviews/settings
│
├── 10. Storefront Analytics                                   (group)
│   ├── Sales & Conversion                → /ecommerce/analytics/sales
│   ├── Traffic & Search Terms            → /ecommerce/analytics/traffic
│   └── Top Products                      → /ecommerce/analytics/top-products
│
└── 11. Notifications & Integrations                            (group)
    ├── Email Templates                   → /ecommerce/integrations/email-templates
    ├── Tracking Codes (GA/FB Pixel)      → /ecommerce/integrations/tracking
    └── Chat / Support Widget             → /ecommerce/integrations/support-widget
```

**Total: 1 parent → 11 groups → 41 leaf pages.**

Groups 10 and 11 can be deferred (see §8 Phasing) if you want a leaner v1 menu —
they're listed for completeness since you asked for "all things."

---

## 3. Sidebar Code (drop-in, matches existing pattern)

```tsx
// icons already available or add: GiShop, LayoutTemplate, Sliders, Megaphone,
// Percent, Timer, Star, Menu as MenuIcon, PanelBottom, Images, Globe2, Languages,
// MessageSquareText, Ticket, Truck, RotateCcw, Users2, Heart, ClipboardCheck,
// BarChart3, Search, TrendingUp, Mail, Code2, MessagesSquare

{
  name: 'Ecommerce Management',
  icon: GiShop,
  superAdminOnly: true,
  children: [
    {
      name: 'Storefront Settings',
      icon: Settings,
      children: [
        { name: 'Status & Activation', href: '/ecommerce/settings/status', icon: Power },
        { name: 'Store / Company Information', href: '/ecommerce/settings/company', icon: Building2 },
        { name: 'Localization & Currency', href: '/ecommerce/settings/localization', icon: Globe2 },
        { name: 'SEO & Meta Defaults', href: '/ecommerce/settings/seo', icon: Search },
        { name: 'Payment Methods', href: '/ecommerce/settings/payments', icon: MdPayment },
        { name: 'Shipping & Delivery', href: '/ecommerce/settings/shipping', icon: Truck },
      ],
    },
    {
      name: 'Appearance & Branding',
      icon: LayoutTemplate,
      children: [
        { name: 'Theme & Colors', href: '/ecommerce/appearance/theme', icon: Palette },
        { name: 'Logo & Favicon', href: '/ecommerce/appearance/logo', icon: Image },
        { name: 'Header & Menu Builder', href: '/ecommerce/appearance/header-menu', icon: MenuIcon },
        { name: 'Footer Builder', href: '/ecommerce/appearance/footer', icon: PanelBottom },
      ],
    },
    {
      name: 'Homepage Customization',
      icon: LayoutDashboard,
      children: [
        { name: 'Hero Slider', href: '/ecommerce/homepage/hero-slider', icon: Sliders },
        { name: 'Promotional Banners', href: '/ecommerce/homepage/banners', icon: Megaphone },
        { name: 'Flash Sale / Countdown', href: '/ecommerce/homepage/flash-sale', icon: Timer },
        { name: 'Featured Products', href: '/ecommerce/homepage/featured', icon: Star },
        { name: 'Category Showcase', href: '/ecommerce/homepage/categories', icon: Boxes },
        { name: 'Trust Badges & Promo Strip', href: '/ecommerce/homepage/trust-badges', icon: ClipboardCheck },
      ],
    },
    {
      name: 'Product Display & Merchandising',
      icon: Package,
      children: [
        { name: 'Display Settings', href: '/ecommerce/products/display', icon: List },
        { name: 'Storefront Visibility', href: '/ecommerce/products/visibility', icon: Eye },
        { name: 'Featured / New / Bestseller Flags', href: '/ecommerce/products/flags', icon: Tag },
        { name: 'Category & Brand Page Content', href: '/ecommerce/products/category-content', icon: FileText },
        { name: 'Related / Cross-sell / Up-sell', href: '/ecommerce/products/relations', icon: GitBranch },
      ],
    },
    {
      name: 'Content & Pages',
      icon: BsFilePost,
      children: [
        { name: 'Static Pages (CMS)', href: '/ecommerce/content/pages', icon: FileText },
        { name: 'Announcement Bar', href: '/ecommerce/content/announcement', icon: MessageSquareText },
        { name: 'Blog / News', href: '/ecommerce/content/blog', icon: MdOutlinePostAdd },
        { name: 'Media Library', href: '/ecommerce/content/media', icon: Images },
      ],
    },
    {
      name: 'Promotions & Coupons',
      icon: Percent,
      children: [
        { name: 'Coupons', href: '/ecommerce/promotions/coupons', icon: Ticket },
        { name: 'Flash Sale Campaigns', href: '/ecommerce/promotions/campaigns', icon: Timer },
        { name: 'Customer Group Pricing', href: '/ecommerce/promotions/group-pricing', icon: Users2 },
      ],
    },
    {
      name: 'Storefront Orders',
      icon: MdOutlinePointOfSale,
      children: [
        { name: 'All Orders', href: '/ecommerce/orders', icon: ClipboardList },
        { name: 'Order Status Workflow', href: '/ecommerce/orders/status', icon: ListTodo },
        { name: 'Returns & Refunds', href: '/ecommerce/orders/returns', icon: RotateCcw },
        { name: 'Shipping Zones & Rates', href: '/ecommerce/orders/shipping-zones', icon: Truck },
      ],
    },
    {
      name: 'Storefront Customers',
      icon: Users,
      children: [
        { name: 'Customer List', href: '/ecommerce/customers', icon: Users },
        { name: 'Customer Groups', href: '/ecommerce/customers/groups', icon: Users2 },
        { name: 'Wishlist Insights', href: '/ecommerce/customers/wishlist-insights', icon: Heart },
      ],
    },
    {
      name: 'Reviews & Ratings',
      icon: Star,
      children: [
        { name: 'Moderation Queue', href: '/ecommerce/reviews/queue', icon: ClipboardCheck },
        { name: 'Review Settings', href: '/ecommerce/reviews/settings', icon: Settings },
      ],
    },
    {
      name: 'Storefront Analytics',
      icon: BarChart3,
      children: [
        { name: 'Sales & Conversion', href: '/ecommerce/analytics/sales', icon: TrendingUp },
        { name: 'Traffic & Search Terms', href: '/ecommerce/analytics/traffic', icon: Search },
        { name: 'Top Products', href: '/ecommerce/analytics/top-products', icon: PieChart },
      ],
    },
    {
      name: 'Notifications & Integrations',
      icon: MessagesSquare,
      children: [
        { name: 'Email Templates', href: '/ecommerce/integrations/email-templates', icon: Mail },
        { name: 'Tracking Codes (GA/FB Pixel)', href: '/ecommerce/integrations/tracking', icon: Code2 },
        { name: 'Chat / Support Widget', href: '/ecommerce/integrations/support-widget', icon: MessagesSquare },
      ],
    },
  ],
},
```

---

## 4. Detailed Breakdown Per Group

### 4.1 Storefront Settings

| Page | Fields / Features | Backend source |
|---|---|---|
| **Status & Activation** | Read-only `storefront_active` state + active tenant name + "Go to Tenant Management" link + storefront URL preview + last-published timestamp | `tenants.storefront_active` |
| **Store / Company Information** ("website data") | Store name, legal name, tagline, logo, favicon, support email, support phone, WhatsApp number, physical address, business hours (per day), social links (Facebook/Instagram/YouTube/TikTok/X) | NEW `store_settings` (or `tenant_settings` JSON key `storefront_company`) |
| **Localization & Currency** ("locale") | Default language (`en`, `bn`, extensible), currency code + symbol + position (prefix/suffix), timezone, date format, number format, weight unit (kg/lb), measurement unit, RTL toggle (future) | NEW key `storefront_locale` |
| **SEO & Meta Defaults** | Default meta title/description template, OG image, robots.txt toggle, sitemap toggle, canonical domain | `storefront_seo` |
| **Payment Methods** | Enable/disable per gateway (COD, bKash, Nagad, Rocket, SSLCommerz/card, bank transfer), min/max order per method, COD city restriction | `storefront_payment_methods` |
| **Shipping & Delivery** | Flat rate, free-shipping threshold, delivery day estimates, pickup-from-store toggle | `storefront_shipping` |

### 4.2 Appearance & Branding

| Page | Features |
|---|---|
| **Theme & Colors** | Primary/accent color pickers (live preview swatch), font pairing selector, dark-mode toggle for storefront (optional) |
| **Logo & Favicon** | Upload logo (light/dark variant), favicon upload with auto-resize preview |
| **Header & Menu Builder** | Drag-reorder nav links (map to categories or custom links), toggle "show search bar", toggle "show account/wishlist icons", top utility bar text (e.g., "Free shipping over ৳500") |
| **Footer Builder** | Sortable footer columns, each with title + links list; social icons row; copyright text; payment-method badges toggle |

### 4.3 Homepage Customization

| Page | Features |
|---|---|
| **Hero Slider** | Sortable slide list (drag & reorder), per slide: image upload w/ crop + preview, title, subtitle, CTA text + link, text alignment, active/inactive toggle, schedule start/end date, "Preview" button |
| **Promotional Banners** | Same pattern for 2-column / side / bottom banner placements; placement selector |
| **Flash Sale / Countdown** | Toggle on/off, end date-time picker, linked product tag/collection, banner text |
| **Featured Products** | Product picker (search/autocomplete, multi-select), drag to reorder, section title override |
| **Category Showcase** | Toggle which categories show on homepage, order, per-category image override, display style (grid/carousel) |
| **Trust Badges & Promo Strip** | Editable list of trust items (icon + text) e.g. "Free shipping", "7-day returns", "Secure checkout"; marquee promo strip text |

### 4.4 Product Display & Merchandising

| Page | Features |
|---|---|
| **Display Settings** | Default grid/list view, items per page, default sort, out-of-stock visibility (hide/show/show with badge) |
| **Storefront Visibility** | Bulk toggle `is_visible_on_storefront` per product (table w/ search + bulk actions) — closes the "which products show" gap |
| **Featured / New / Bestseller Flags** | Bulk/individual toggle of `is_featured`, `is_new`, `is_bestseller`, `is_on_sale` flags |
| **Category & Brand Page Content** | Per category/brand: custom banner image, rich-text description block, SEO override |
| **Related / Cross-sell / Up-sell** | Manage `product_relations` — pick related/cross-sell/up-sell products per product |

### 4.5 Content & Pages

| Page | Features |
|---|---|
| **Static Pages (CMS)** | List + rich-text editor for About, Contact, Terms, Privacy, Return Policy, FAQ — create custom pages too (slug, title, body, SEO meta, publish toggle) |
| **Announcement Bar** | Text, link, enable/disable, color picker, dismissible toggle, schedule |
| **Blog / News** *(optional, phase 3+)* | Simple post list, title/body/cover image/publish date |
| **Media Library** | Central gallery of uploaded storefront images (search, filter by usage, delete unused) |

### 4.6 Promotions & Coupons

| Page | Features |
|---|---|
| **Coupons** | Create/edit coupon: code, type (%, flat), value, min order, max discount, date range, usage limit, per-customer limit, applicable products/categories; redemption log |
| **Flash Sale Campaigns** | Schedule campaign, tag products, countdown banner linkage |
| **Customer Group Pricing** | Assign discount tiers to customer groups (retail/wholesale/dealer) |

### 4.7 Storefront Orders

| Page | Features |
|---|---|
| **All Orders** | Table: invoice #, customer, date, status, payment status, total; filters; view detail (reuses existing sales-order detail) |
| **Order Status Workflow** | Configure allowed status transitions, auto-emails per status |
| **Returns & Refunds** | Queue of return requests, approve/reject, link to `sales_return` |
| **Shipping Zones & Rates** | Zones (by city/area), rate per zone, free-shipping override per zone |

### 4.8 Storefront Customers

| Page | Features |
|---|---|
| **Customer List** | Registered storefront customers: name, email, phone, orders count, total spent, registered date, status |
| **Customer Groups** | Create groups (VIP, Wholesale) for targeted pricing/promotions |
| **Wishlist Insights** | Most-wishlisted products report (helps merchandising decisions) |

### 4.9 Reviews & Ratings

| Page | Features |
|---|---|
| **Moderation Queue** | Pending reviews list, approve/reject, admin response, flag inappropriate |
| **Review Settings** | Require verified purchase toggle, auto-approve toggle, allow photo uploads toggle |

### 4.10 Storefront Analytics

| Page | Features |
|---|---|
| **Sales & Conversion** | Orders/revenue trend, conversion rate, cart abandonment rate |
| **Traffic & Search Terms** | Top search queries, zero-result searches, page views (if analytics wired) |
| **Top Products** | Best sellers, most viewed, most wishlisted — table + chart |

### 4.11 Notifications & Integrations

| Page | Features |
|---|---|
| **Email Templates** | Order confirmation, shipped, delivered, cancelled — editable subject/body with variables |
| **Tracking Codes** | Google Analytics ID, Facebook Pixel ID, custom `<head>` script injection (sanitized) |
| **Chat / Support Widget** | Enable/disable + widget script (Tawk.to, WhatsApp click-to-chat number) |

---

## 5. Data Model Additions Needed (backend)

Most groups persist to a single JSON-keyed settings table so no group requires its own
migration. Suggested shape (extends what `STOREFRONT_IMPLEMENTATION_PLAN.md` Phase A
already proposes: `add_storefront_keys_to_tenant_settings`):

```
store_settings (or tenant_settings JSON keys), one row per tenant:
  storefront_company        { store_name, legal_name, tagline, logo_url, favicon_url,
                               support_email, support_phone, whatsapp, address,
                               business_hours[], social_links{} }
  storefront_locale          { language, currency_code, currency_symbol,
                               currency_position, timezone, date_format,
                               number_format, weight_unit }
  storefront_seo             { meta_title_template, meta_description, og_image,
                               robots_enabled, sitemap_enabled }
  storefront_payment_methods { enabled: string[], cod_cities: string[], ... }
  storefront_shipping        { flat_rate, free_shipping_threshold, delivery_days,
                                pickup_enabled }
  storefront_theme           { primary_color, accent_color, font, dark_mode }
  storefront_header_menu     { links: [{label, href, order}], show_search, ... }
  storefront_footer          { columns: [{title, links:[]}], social, copyright }
  storefront_hero_slides     [{ image, title, subtitle, cta_text, cta_link, order,
                                active, starts_at, ends_at }]
  storefront_banners         [{ image, link, placement, order, active }]
  storefront_flash_sale      { enabled, ends_at, tag, banner_text }
  storefront_featured_products [productId...]
  storefront_homepage_categories [{ categoryId, order, style }]
  storefront_trust_badges    [{ icon, text }]
  storefront_announcement    { text, link, enabled, bg_color, text_color,
                                dismissible, starts_at, ends_at }
  storefront_tracking        { ga_id, fb_pixel_id, custom_head_script }
  storefront_support_widget  { enabled, provider, script_or_number }
```

New **tables** (already flagged in `STOREFRONT_IMPLEMENTATION_PLAN.md` Phase A2 — carried
over here since the menu above depends on them):

- `add_is_visible_on_storefront_to_products` (+ `is_new`, `is_bestseller` if missing)
- `create_product_reviews_table`
- `create_wishlists_table`
- `create_coupons_table` + `coupon_products` + `coupon_redemptions_table`
- `create_cms_pages_table` (slug, title, body, meta_title, meta_description, is_published)
- `create_customer_groups_table` (+ pivot on `customers`)
- `product_relations` (related/cross_sell/up_sell — reuse if it already exists)

---

## 6. UI Components Needed

| Component | Used by |
|---|---|
| `SortableImageList` | Hero Slider, Banners, Category Showcase |
| `ImageUploader` (crop + preview) | Logo/Favicon, Slider, Banners, Media Library |
| `RichTextEditor` | Static Pages, Category/Brand content, Blog |
| `ProductPicker` (search/select modal) | Featured Products, Coupons (product scope), Relations |
| `ColorPicker` | Theme, Announcement Bar |
| `DateRangePicker` | Flash Sale, Coupons, Slide scheduling |
| `DragSortableList` | Header Menu Builder, Footer Builder, Featured Products order |
| `RichBadgeToggleTable` (bulk toggle grid) | Storefront Visibility, Product Flags |
| `KeyValueScriptEditor` (sanitized textarea) | Tracking Codes |

---

## 7. Routes Structure

```
app/(protected)/ecommerce/
├── settings/
│   ├── status/page.tsx
│   ├── company/page.tsx
│   ├── localization/page.tsx
│   ├── seo/page.tsx
│   ├── payments/page.tsx
│   └── shipping/page.tsx
├── appearance/
│   ├── theme/page.tsx
│   ├── logo/page.tsx
│   ├── header-menu/page.tsx
│   └── footer/page.tsx
├── homepage/
│   ├── hero-slider/page.tsx
│   ├── banners/page.tsx
│   ├── flash-sale/page.tsx
│   ├── featured/page.tsx
│   ├── categories/page.tsx
│   └── trust-badges/page.tsx
├── products/
│   ├── display/page.tsx
│   ├── visibility/page.tsx
│   ├── flags/page.tsx
│   ├── category-content/page.tsx
│   └── relations/page.tsx
├── content/
│   ├── pages/page.tsx
│   ├── announcement/page.tsx
│   ├── blog/page.tsx
│   └── media/page.tsx
├── promotions/
│   ├── coupons/page.tsx
│   ├── campaigns/page.tsx
│   └── group-pricing/page.tsx
├── orders/
│   ├── page.tsx
│   ├── status/page.tsx
│   ├── returns/page.tsx
│   └── shipping-zones/page.tsx
├── customers/
│   ├── page.tsx
│   ├── groups/page.tsx
│   └── wishlist-insights/page.tsx
├── reviews/
│   ├── queue/page.tsx
│   └── settings/page.tsx
├── analytics/
│   ├── sales/page.tsx
│   ├── traffic/page.tsx
│   └── top-products/page.tsx
└── integrations/
    ├── email-templates/page.tsx
    ├── tracking/page.tsx
    └── support-widget/page.tsx
```

---

## 8. Permission Strategy

- Top-level **Ecommerce Management**: `superAdminOnly: true`.
- Sub-groups/leaves: no individual permission fields in v1 (all gated by super-admin
  access, same as `Settings`). Add `permission`/`permissions` fields per leaf later if
  storefront management gets delegated to a tenant-level "Store Manager" role — the
  interface already supports it without structural change.

---

## 9. Implementation Phasing (priority order)

| Phase | Groups / Pages | Rationale |
|---|---|---|
| **Phase 1** | Sidebar entry + all 41 route stubs (empty placeholders) | Menu fully navigable first |
| **Phase 2** | Storefront Settings (Status, Company Info, Localization, SEO) | Foundation data every other page needs (currency, locale) |
| **Phase 3** | Homepage Customization (Hero Slider, Banners, Featured, Categories, Trust Badges, Flash Sale) | Highest visual impact, matches "hero slider" ask |
| **Phase 4** | Appearance & Branding (Theme, Logo, Header/Footer builder) | Branding consistency before content work |
| **Phase 5** | Content & Pages (CMS pages, Announcement, Media Library) | Legal/about pages required for launch |
| **Phase 6** | Product Display & Merchandising (Visibility, Flags, Relations, Category content) | Enables real catalog to appear correctly |
| **Phase 7** | Storefront Orders + Customers (mostly read/manage existing data) | Operational, needed once orders start flowing |
| **Phase 8** | Promotions & Coupons | Marketing lever, after core catalog/checkout stable |
| **Phase 9** | Reviews & Ratings | Needs orders history for verified-purchase checks |
| **Phase 10** | Storefront Analytics + Notifications & Integrations | Nice-to-have, can launch without; add once traffic exists |

---

## 10. Open Questions Before Build

1. **Blog/News** — keep in v1 menu or hide until a tenant actually asks for it? (default: build stub only, low priority)
2. **Customer Group Pricing** — tie into existing `customers.type` (retail/wholesale/dealer/corporate) or a brand-new `customer_groups` table?
3. **Tracking Codes** page injects raw `<script>` — needs strict sanitization/allow-list before enabling (security review required).
4. **Multi-language (locale)** — v1 scope is just *storefront default language selection* (metadata/labels), not full i18n translation management. Confirm if a translations editor (per-string) is needed later.
5. Confirms same backend dependency list as `STOREFRONT_IMPLEMENTATION_PLAN.md` Phase A/K — this menu plan assumes those migrations/endpoints land in parallel.
