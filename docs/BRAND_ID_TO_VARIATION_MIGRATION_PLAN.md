# Brand ID Migration Plan: `products` → `product_variations`

## Goal
Move `brand_id` from the `products` table down to the `product_variations` table so that:
- `products` becomes a brand-agnostic master item (name unique per `business_type_id`, no re-entry of shared fields per brand).
- Each brand of an item is represented as its own `product_variations` row (with its own `sku`, `cost_price`, `selling_price`, `mrp`, `is_default`), optionally combined with attribute variations (color/size).

Related branch: `brand_id_transfer_product_into_product_brand` (inventory-ui), same-named branch expected in inventory-api.

---

## Current State (confirmed)
- `products.brand_id` → `brands.id` (nullable FK), unique constraint on `products` is `(name, business_type_id)`.
- `products`, `categories`, `brands`, `product_variations` are **not tenant-scoped** — shared master catalog per `business_type_id`. Only `stocks` is tenant-scoped (quantity/avg_cost/last_cost).
- Every product (even `type = simple`) already has ≥1 row in `product_variations`, since pricing (`cost_price`, `selling_price`, `mrp`) already lives there, not on `products`.
- `product_variations.sku` is globally unique; no current constraint enforces uniqueness of attribute combinations at the DB level (handled in app logic).
- ~35 existing references to `products.brand_id` across both repos (validation, filters, eager loading, reports, import/export, storefront) — see inventory below.

---

## Backend Plan (inventory-api)

### Phase 1 — Schema (additive, non-breaking)
- [ ] Add nullable `brand_id` FK column to `product_variations` (→ `brands.id`, `onDelete('set null')`), with index.
- [ ] Keep `products.brand_id` in place for now (do **not** drop yet) — dual-column state during transition.
- [ ] Data backfill migration: for every existing `product_variations` row, set `brand_id = products.brand_id` from its parent product (single UPDATE JOIN, one-time script/migration).
- [ ] Add app-level uniqueness validation for `(product_id, brand_id, attribute-combo)` in the variation creation/update path (no DB constraint exists for attribute combos today, so this must be enforced in code, matching the existing pattern).

### Phase 2 — Model layer
- [ ] `ProductVariation.php`: add `brand_id` to `$fillable`, add `brand()` → `belongsTo(Brand::class)` relation.
- [ ] `Product.php`: keep `brand()` relation temporarily (reads `products.brand_id`) for backward compatibility during transition; mark as deprecated in a comment once Phase 4 lands.

### Phase 3 — Validation
- [ ] `ProductTrait.php`: move `brand_id` validation rule off product create/edit/bulk rules; add equivalent rule to variation create/edit/bulk validation (`nullable|exists:brands,id`, or `required` depending on product type policy).
- [ ] `StockValuationRequest.php` and any other report request classes: no signature change needed (still accepts `brand_id` as a filter param), only the underlying query changes.

### Phase 4 — Traits/Controllers (filters, eager loading)
Update each of the following to resolve brand through `product_variations.brand_id` instead of `products.brand_id`:
- [ ] `ProductTrait.php` — list filter (`$query->where('brand_id', ...)`) → `whereHas('variations', fn($q) => $q->where('brand_id', $bid))`.
- [ ] `CommonTrait.php` — brand param extraction, eager loading `with(['brand'])`, `is_brand` bulk-fetch logic — repoint to variations.
- [ ] `ProductVariationTrait.php` — already touches variations; add brand eager load/select here directly (least change needed).
- [ ] `ReportTrait.php` — stock valuation / reorder / shrinkage / dead-stock brand filters → join through variation instead of `whereHas('product', ...)`.
- [ ] `ProductFlagsTrait.php` — brand grouping logic shifts from product-level group-by to variation-level group-by (a product may now yield multiple brand groups).
- [ ] `ProductController.php` — eager loading (`with('brand')`) on list/create/edit/show responses → load via variations; decide how a product's "primary brand" is displayed (e.g. default variation's brand) for list/tree views.
- [ ] `StorefrontCatalogController.php`, `StorefrontSearchController.php`, `StorefrontBrandController.php`, `StorefrontCatalogService.php` — brand filters must join through variations; a single product can now appear under multiple brand pages (only the matching variation should surface there, not the whole product).
- [ ] `StorefrontProductMapTrait.php` — brand mapping in storefront response moves to per-variation mapping.

### Phase 5 — Import/Export
- [ ] `ProductImport.php` — brand assignment moves from product row creation to variation row creation.
- [ ] `ProductSampleExport.php` — Excel template's Brand column/dropdown validation moves to the Variations sheet (if one exists) rather than the Product sheet.

### Phase 6 — Cleanup (only after frontend fully migrated and verified in production)
- [ ] Remove `brand_id` from `products` `$fillable`, drop `brand()` relation from `Product.php`.
- [ ] Drop `products.brand_id` column, its index, and FK (separate migration, run after a full verification window).

---

## Frontend Plan (inventory-ui)

### Phase 1 — Types
- [ ] `types/api.types.ts`: move `brand_id` off `Product`, `CreateProductRequest`, `UpdateProductRequest`; add `brand_id` to `ProductVariation`/`CreateVariationRequest`/`UpdateVariationRequest` types.
- [ ] `types/report.types.ts`: no change needed (filter param shape stays the same).

### Phase 2 — Services
- [ ] `productService.ts`: `getProducts` brand filter param stays same shape but now resolves server-side via variations — no client change needed here beyond type updates.
- [ ] Variation-related service calls (wherever variations are created/updated) gain a `brand_id` field in payload.
- [ ] `reportService.ts`, `storefrontService.ts`: no shape change (still passing `brand_id` as filter param), only confirm backend contract unchanged.

### Phase 3 — Product forms
- [ ] `product-detail-panel.tsx` and `app/(protected)/products/add/page.tsx`: remove brand select + validation from the **product-level** form.
- [ ] Add brand select to the **variation** create/edit UI (wherever variations are added/edited — bulk variation add screen, variation row editor). For `type = simple` products, the single default variation's form should include the brand field in place of the old product-level brand field.
- [ ] Bulk variation generator (referenced in `docs/BULK_VARIATION_ADD.md` equivalent flow): add brand as an outer-loop dimension alongside attribute combinations, so generating variations for "2 brands × 3 colors" produces 6 rows.

### Phase 4 — Product list / tree views
- [ ] `product-tree.tsx`: today groups products directly by `brandId`. Change grouping to be derived from each product's variations (a product can now surface under multiple brand groups, or show its default variation's brand as the primary label with a "+N brands" indicator).
- [ ] Any product list column showing a single "Brand" value: resolve from default/primary variation.

### Phase 5 — Storefront
- [ ] `store/category/[categorySlug]/page.tsx`, `store/products/page.tsx`, `store/search/page.tsx`: brand filter UI/query params stay the same shape; confirm backend still returns correct product matches (now variation-driven).
- [ ] `store/brand/[brandSlug]/page.tsx`: needs to display only the matching **variation(s)** of a product for that brand (price/sku from that variation), not assume the whole product belongs to one brand.

### Phase 6 — Reports UI
- [ ] Brand filter dropdowns in report pages: no UI change expected (still a `brand_id` param), verify results still filter correctly post-backend change.

---

## Rollout Strategy
1. Ship backend Phase 1–2 (additive schema + backfill) with no behavior change — `products.brand_id` still authoritative, `product_variations.brand_id` populated in parallel.
2. Ship backend Phase 3–5 behind careful testing (filters/reports/storefront now read from variations) while keeping `products.brand_id` column present but unused, as a rollback safety net.
3. Ship frontend Phases 1–5 once backend Phase 3–5 is verified in staging.
4. Run both systems in production for a verification window (monitor reports, storefront brand pages, import/export).
5. Only after verification: backend Phase 6 (drop `products.brand_id`).

## Open Questions
- Should `brand_id` be **required** on every variation, or optional (allowing "generic/unbranded" variations)?
- For `type = simple` products with only one variation, should the brand field be mandatory at creation time (mirroring today's "required on edit" rule in `ProductTrait`)?
- How should the storefront "shop by brand" page handle a product that has variations in multiple brands — separate cards per brand, or one card with a brand switcher?
- Do we need a tenant-specific price override table (`tenant_variation_prices`) as a follow-up, since `product_variations.selling_price` is still a shared/global value across tenants of the same business type?
