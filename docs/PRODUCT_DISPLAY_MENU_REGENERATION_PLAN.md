# Product Display Menu — Regeneration Plan

> Implements `ecommerce_product_visibility` per-tenant-per-product table with flags
> (featured/new/bestseller/on-sale), integrated with the Flags page and the
> StorefrontCatalogService.

---

## Data model

`ecommerce_product_visibility` table (per-tenant, per-product):

| Column | Type | Notes |
|---|---|---|
| `id` | auto-increment | |
| `tenant_id` | FK → tenants | |
| `product_id` | FK → products (auto-inc id) | |
| `is_visible_on_storefront` | boolean, default false | Can hide a product from storefront |
| `is_featured` | boolean, default false | Per-tenant featured flag |
| `is_new` | boolean, default false | Per-tenant new-arrival flag |
| `is_bestseller` | boolean, default false | Per-tenant bestseller flag |
| `is_on_sale` | boolean, default false | Per-tenant on-sale flag |
| `hide_when_out_of_stock` | boolean, nullable | Override tenant's OOS policy |
| `display_order` | unsigned int, nullable | Per-tenant sort override |
| `available_from` | timestamp, nullable | Schedule visibility start |
| `available_until` | timestamp, nullable | Schedule visibility end |
| `timestamps` | | |
| Unique | `(tenant_id, product_id)` | |

---

## Sidebar

```
Product Display
├── Display & Stock Rules   → /ecommerce/products/display
├── Featured / New / Bestseller Flags → /ecommerce/products/flags
├── Category & Brand Page Content     → /ecommerce/products/category-content (stub)
└── Related / Cross-sell / Up-sell    → /ecommerce/products/relations (stub)
```

---

## Backend files

| File | Purpose |
|---|---|
| `database/migrations/..._create_ecommerce_product_visibility_table.php` | Migration |
| `app/Models/EcommerceProductVisibility.php` | Model (fillable, casts, tenant/product relations) |
| `app/Traits/ProductFlagsTrait.php` | Business logic: list products with flags, update, bulk update |
| `app/Http/Controllers/Api/Ecommerce/ProductFlagsController.php` | 3 endpoints: index, update, bulkUpdate |
| `routes/route/ecommerce.php` | Routes added under `v1/ecommerce/products/flags/` |
| `app/Services/StorefrontCatalogService.php` | Updated to join `ecommerce_product_visibility` for flag data + visibility filter |

### API Endpoints

| Method | Path | Controller |
|---|---|---|
| GET | `/api/v1/ecommerce/products/flags` | `index` — list products with flag status |
| POST | `/api/v1/ecommerce/products/flags/update` | `update` — toggle one product's flags |
| POST | `/api/v1/ecommerce/products/flags/bulk-update` | `bulkUpdate` — bulk set/clear flags |

---

## Frontend files

| File | Purpose |
|---|---|
| `types/api.types.ts` | Added `ProductFlagsItem` interface |
| `services/productFlagsService.ts` | API client: list, update, bulkUpdate |
| `app/(protected)/ecommerce/products/flags/page.tsx` | Full table with search, per-row toggle switches, bulk set/clear actions, pagination |
| `app/(protected)/ecommerce/products/display/page.tsx` | Display & Stock Rules (uses mocked ecommerceSettingsService) |

### Flags page features
- Search products by name
- Per-row toggle for each flag (featured, new, bestseller, on-sale)
- Bulk select with Set/Clear action per flag
- Shows storefront visibility status per product (from `epv.is_visible_on_storefront`)
- Paginated (20 per page)
- Optimistic UI update on individual toggle

---

## Storefront visibility logic

In `StorefrontCatalogService::visibleProducts()`:
1. `products.status = 'active'`
2. Has stock for tenant (`available_quantity > 0`) OR `allow_backorder = true`
3. `ecommerce_product_visibility.is_visible_on_storefront` is not explicitly `false`
4. Flag columns (`is_featured`, `is_new`, `is_bestseller`, `is_on_sale`) are returned for storefront rendering

---

# Category Page Content

> Manage **thumbnail image** + **page banner** per category.
> Brand uploads not implemented yet.

## Data model

Add one new column to `categories` table; `image_url` already exists:

### `categories` table

| Column | Type | Notes |
|---|---|---|
| `image_url` | text, nullable | Existing — thumbnail/listing image |
| `banner_image` | text, nullable | **New** — full-width page header banner (WebP) |

## Backend files

| File | Purpose |
|---|---|
| `database/migrations/..._add_banner_image_to_categories_table.php` | Add `banner_image` column |
| `app/Models/Category.php` | Add `banner_image` to `$fillable` + `$casts` |
| `app/Traits/CategoryContentTrait.php` | `getContent(id)` returns category with image fields; `updateContent(id, data)` handles thumbnail + banner upload/remove |
| `app/Http/Controllers/Api/Ecommerce/CategoryContentController.php` | `show(id)` + `update(id)` |
| `routes/route/ecommerce.php` | Routes under `v1/ecommerce/products/category-content/` |

### Image upload patterns

| Field | Directory | Target dims | DB column |
|---|---|---|---|
| `image` (thumbnail) | `uploads/categories/{categoryId}/thumbnail/` | 250×250 | `image_url` |
| `banner_image` | `uploads/categories/{categoryId}/` | 900×400 | `banner_image` |

- WebP conversion + resize via Intervention Image (same pattern as `HeroSliderImageTrait`)
- Delete old file when replacing or removing
- Store as relative path; expose `image_url`/`banner_image_url` in response

### API Endpoints

| Method | Path | Controller | Notes |
|---|---|---|---|
| GET | `/api/v1/ecommerce/products/category-content/{id}` | `show` | Returns category with both image fields |
| PUT | `/api/v1/ecommerce/products/category-content/{id}` | `update` | Multipart: `image` (file) + `banner_image` (file); omit to keep, empty string to remove |

Response shape:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Laptops",
    "slug": "laptops",
    "image_url": "https://...",
    "banner_image": "uploads/categories/banners/abc123.webp",
    "banner_image_url": "https://...",
    "updated_at": "..."
  }
}
```

## Frontend files

| File | Purpose |
|---|---|
| `services/categoryContentService.ts` | Typed API client: `getContent(id)` + `updateContent(id, formData)` |
| `types/api.types.ts` | Add `CategoryContent` interface |
| `components/ui/image-upload.tsx` | Drop-zone image upload with preview + remove (reusable) |
| `app/(protected)/ecommerce/products/category-content/page.tsx` | **Full implementation** replacing stub |

### Page UI layout

```
┌──────────────────────────────────────────────────┐
│  Category Page Content                            │
│                                                   │
│  Category: [Search & Select category... ▼]        │
│                                                   │
│  ┌─ Thumbnail Image ─────────────────────────┐   │
│  │      [ Drop or click to upload ]          │   │
│  │      (JPG, PNG, WebP · max 2MB)          │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  [preview]                  [Remove] │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  ┌─ Banner Image ────────────────────────────┐   │
│  │      [ Drop or click to upload ]          │   │
│  │      (JPG, PNG, WebP · max 2MB)          │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  [preview]                  [Remove] │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  [Save Changes]                                    │
└──────────────────────────────────────────────────┘
```

### Page features
- Category async-select picker (filtered by storefront-active tenant's `business_type_id`)
- On select → fetch existing data via GET API, show current images
- Two `image-upload` sections: **Thumbnail** + **Banner**
- Each uploader: drop-zone, file type/size validation, preview, remove button
- Save sends PUT with multipart form data
- Loading/error/success states
