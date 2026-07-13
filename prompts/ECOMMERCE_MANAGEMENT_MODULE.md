# Ecommerce Management Module — UI Plan

## Module Position in Sidebar

Insert between **POS Management** and **Accounting Management** (or after **Accounting Management** and before **Report Management**) as a top-level menu item with `superAdminOnly: true` (since only one tenant can have storefront active at a time, and the super admin manages it via the Tenant form's toggle).

---

## Structure (3-layer — same pattern as Report Management)

```
Ecommerce Management
├── Storefront Settings      (group)
│   ├── Status & Activation       → /ecommerce/settings/status
│   ├── General Settings          → /ecommerce/settings/general
│   ├── SEO & Meta                → /ecommerce/settings/seo
│   └── Payment & Shipping        → /ecommerce/settings/payment-shipping
├── Homepage Customization   (group)
│   ├── Hero Slider Images        → /ecommerce/homepage/sliders     ← slider upload
│   ├── Promotional Banners       → /ecommerce/homepage/banners
│   ├── Featured Products         → /ecommerce/homepage/featured
│   └── Category Display          → /ecommerce/homepage/categories
├── Product Display          (group)
│   ├── Display Settings          → /ecommerce/products/display
│   ├── Featured / Trending       → /ecommerce/products/featured
│   └── Category & Brand Pages    → /ecommerce/products/categories
├── Storefront Orders        (group)
│   ├── All Orders                → /ecommerce/orders
│   ├── Order Status Management   → /ecommerce/orders/status
│   └── Shipping Configuration    → /ecommerce/orders/shipping
├── Storefront Customers     (group)
│   ├── Customer List             → /ecommerce/customers
│   └── Customer Groups           → /ecommerce/customers/groups
└── Content & Pages          (group)
    ├── Static Pages (About, Contact, Terms…)  → /ecommerce/content/pages
    ├── Announcement Bar                      → /ecommerce/content/announcement
    └── Footer Content                        → /ecommerce/content/footer
```

**Total: 1 parent → 7 groups → ~22 leaf pages**

---

## Key UI Features per Section

### 1. Storefront Settings
- **Status & Activation**: Shows current `storefront_active` state (read-only, since toggle is on Tenant form). Displays the active tenant name. Quick link to Tenant Management.
- **General Settings**: Store name, tagline, email, phone, address, currency, tax rate, free shipping threshold — editable form.
- **SEO & Meta**: Default meta title, description, OG image, favicon upload.
- **Payment & Shipping**: Available payment methods (COD, online gateway), shipping zones, delivery days.

### 2. Homepage Customization
- **Hero Slider Images** (slider upload):
  - Sortable list of slides (drag & reorder)
  - Each slide: image upload (with preview + crop), title, subtitle, CTA text + link, accent color/gradient
  - Toggle visibility per slide
  - Preview button
- **Promotional Banners**: Same pattern as sliders but for promo banner placements (side banners, bottom banners).
- **Featured Products**: Product selector (search/autocomplete) to pin products to "Featured" sections. Multiple rows.
- **Category Display**: Toggle which categories appear on homepage, their order, and display style (grid/carousel).

### 3. Product Display
- **Display Settings**: Grid vs list default, items per page, sort options, out-of-stock visibility.
- **Featured / Trending**: Auto-criteria (by sales, by views) or manual pinning.
- **Category & Brand Pages**: Custom banners/descriptions per category/brand page.

### 4. Storefront Orders
- **All Orders**: Table of storefront orders with filters (status, date, customer). Click to view detail (already exists in protected).
- **Order Status**: Manage status workflows (pending → confirmed → processing → shipped → delivered).
- **Shipping Configuration**: Flat rate, free shipping threshold, delivery time estimates.

### 5. Storefront Customers
- **Customer List**: Table of registered storefront customers (name, email, orders count, registration date).
- **Customer Groups**: Create groups for targeted promotions.

### 6. Content & Pages
- **Static Pages**: Rich text editor for About, Contact, Terms, Privacy, Returns policy pages.
- **Announcement Bar**: Top bar text, link, enable/disable toggle, background/text color picker.
- **Footer Content**: Footer columns, links, social media URLs, copyright text.

---

## UI Components Needed

| Component | Description |
|-----------|-------------|
| `SortableImageList` | Drag-reorderable list with image preview, used for sliders/banners |
| `ImageUploader` | Cloudinary/S3 upload with crop, preview, delete |
| `RichTextEditor` | WYSIWYG for static pages |
| `ProductPicker` | Search/select products from a modal |
| `ColorPicker` | For gradient/color settings |

---

## Permission Strategy

- Top-level **Ecommerce Management**: `superAdminOnly: true` (same as Settings/Tenant Management — only super admin can configure the storefront)
- Sub-items: No individual permissions initially (all gated by super admin access), but extensible later with `permission` fields.

---

## Routes Structure

All pages live under `app/(protected)/ecommerce/`:
```
app/(protected)/ecommerce/
├── settings/
│   ├── status/page.tsx
│   ├── general/page.tsx
│   ├── seo/page.tsx
│   └── payment-shipping/page.tsx
├── homepage/
│   ├── sliders/page.tsx
│   ├── banners/page.tsx
│   ├── featured/page.tsx
│   └── categories/page.tsx
├── products/
│   ├── display/page.tsx
│   ├── featured/page.tsx
│   └── categories/page.tsx
├── orders/
│   ├── page.tsx
│   ├── status/page.tsx
│   └── shipping/page.tsx
├── customers/
│   ├── page.tsx
│   └── groups/page.tsx
└── content/
    ├── pages/page.tsx
    ├── announcement/page.tsx
    └── footer/page.tsx
```

---

## Implementation Order

| Phase | Items | Notes |
|-------|-------|-------|
| **Phase 1** | Sidebar entry + route scaffolding + empty placeholder pages | Get the menu working first |
| **Phase 2** | Storefront Settings (status, general, seo) | Backend APIs needed |
| **Phase 3** | Homepage — Sliders + Banners | Image upload, sortable list |
| **Phase 4** | Product Display + Featured Products | Product picker component |
| **Phase 5** | Orders + Customers | Read-only data tables initially |
| **Phase 6** | Content & Pages | Rich text editor |
